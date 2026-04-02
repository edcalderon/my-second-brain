import puppeteer from 'puppeteer';
import { TwitterApi } from 'twitter-api-v2';
// import * as functions from 'firebase-functions'; // Removed unused
import { Storage } from '@google-cloud/storage';

const storage = new Storage();
const BUCKET_NAME = process.env.GCP_BUCKET_NAME || 'second-brain-screenshots';

// Environment variables
const GITHUB_URL = process.env.GITHUB_PAGE_URL || 'https://github.com/edcalderon';
// The specific tweet ID to reply to. Can be overridden by env var.
const DEFAULT_REPLY_TO_ID = '2007025581188436301';

const getRequestValue = (req: any, key: string) => {
    const value = req?.body?.[key] ?? req?.query?.[key];
    return Array.isArray(value) ? value[0] : value;
};

const asString = (value: unknown) => typeof value === 'string' ? value.trim() : '';

const isValidDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(value).getTime());

const getTodayIso = () => new Date().toISOString().split('T')[0];

const getYesterdayIso = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
};

const shouldFallbackToStandaloneTweet = (error: unknown) => {
    const typedError = error as {
        code?: number;
        statusCode?: number;
        data?: { title?: string; detail?: string; type?: string };
        message?: string;
    };

    const statusCode = typedError.code ?? typedError.statusCode;
    const text = [
        typedError.data?.title,
        typedError.data?.detail,
        typedError.data?.type,
        typedError.message,
    ].filter(Boolean).join(' ').toLowerCase();

    return statusCode === 403 || statusCode === 404 || statusCode === 429 || /reply|limit|forbidden|rate limit|too many/.test(text);
};

/**
 * Captures a screenshot of the specified GitHub page contribution graph and posts it as a reply to a tweet.
 */
export const captureAndTweet = async (req: any, res: any) => {
    console.log('📸 Starting GitHub Custom Screenshot & Tweet process...');

    // 1. Validate Twitter Config
    if (!process.env.TWITTER_APP_KEY || !process.env.TWITTER_ACCESS_TOKEN) {
        console.error('❌ Missing Twitter API credentials.');
        return res.status(500).json({ error: 'Missing Twitter configuration.' });
    }

    const mode = asString(getRequestValue(req, 'mode')).toLowerCase();
    const isResumeMode = mode === 'resume' || asString(getRequestValue(req, 'resume')).toLowerCase() === 'true';

    const currentYear = new Date().getFullYear();
    const defaultFromDate = `${currentYear}-01-01`;
    const defaultToDate = getTodayIso();

    const requestedFromDate = asString(getRequestValue(req, 'fromDate') ?? getRequestValue(req, 'from'));
    const requestedToDate = asString(getRequestValue(req, 'toDate') ?? getRequestValue(req, 'to'));

    const fromDate = requestedFromDate || (isResumeMode ? '' : defaultFromDate);
    const toDate = requestedToDate || (isResumeMode ? getYesterdayIso() : defaultToDate);

    if (!isValidDate(fromDate) || !isValidDate(toDate)) {
        return res.status(400).json({
            error: 'Invalid date range.',
            expectedFormat: 'YYYY-MM-DD',
            fromDate,
            toDate,
        });
    }

    if (new Date(fromDate) > new Date(toDate)) {
        return res.status(400).json({
            error: 'fromDate must be on or before toDate.',
            fromDate,
            toDate,
        });
    }

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    try {
        // 2. Capture Screenshot
        const page = await browser.newPage();

        // Set viewports
        await page.setViewport({ width: 1920, height: 1080 });

        // Construct URL to force the contribution view for the requested range
        const targetUrl = `${GITHUB_URL}?tab=overview&from=${fromDate}&to=${toDate}`;
        console.log(`🌐 Navigating to ${targetUrl}...`);

        await page.goto(targetUrl, { waitUntil: 'networkidle2' });

        // Selector for the "Contributions in 2026" section
        // We look for the main contribution graph container. 
        // The class 'js-yearly-contributions' usually wraps the graph + header.
        const selector = '.js-yearly-contributions';

        try {
            await page.waitForSelector(selector, { timeout: 10000 });
        } catch (_e) {
            console.warn(`Selector ${selector} not found immediately, trying fallback or dumping html...`);
            // Fallback: capture a general area or the whole page if specific graph not found
        }

        const element = await page.$(selector);
        let screenshotBuffer;

        if (element) {
            console.log(`✅ Found contribution graph element: ${selector}`);
            screenshotBuffer = await element.screenshot({ type: 'png' });
        } else {
            console.warn(`⚠️ Could not find contribution graph element, taking full page screenshot instead.`);
            screenshotBuffer = await page.screenshot({ type: 'png', fullPage: false });
        }

        // DEBUG: Save locally if requested
        if (process.env.SAVE_LOCAL_SCREENSHOT === 'true') {
            const fs = await import('fs');
            fs.writeFileSync('debug-screenshot.png', screenshotBuffer);
            console.log('📸 Saved debug-screenshot.png locally for inspection');
        }

        console.log('📸 Screenshot captured.');

        // 2a. Save to Firebase Storage
        try {
            const dateStr = getTodayIso();
            const fileName = isResumeMode || requestedFromDate || requestedToDate
                ? `github-screenshots/resume-${fromDate}-to-${toDate}.png`
                : `github-screenshots/${dateStr}.png`;
            const bucket = storage.bucket(BUCKET_NAME);
            const file = bucket.file(fileName);

            await file.save(screenshotBuffer, {
                contentType: 'image/png',
                metadata: {
                    metadata: {
                        source: 'github-screenshot-bot',
                        date: dateStr
                    }
                }
            });
            console.log(`✅ Saved screenshot to Storage: gs://${BUCKET_NAME}/${fileName}`);
        } catch (storageError) {
            console.error('⚠ Failed to save to Storage (continuing to tweet):', storageError);
        }

        // 3. Upload to Twitter
        const client = new TwitterApi({
            appKey: process.env.TWITTER_APP_KEY!,
            appSecret: process.env.TWITTER_APP_SECRET!,
            accessToken: process.env.TWITTER_ACCESS_TOKEN!,
            accessSecret: process.env.TWITTER_ACCESS_SECRET!,
        });

        console.log('🐦 Uploading media to Twitter...');
        const mediaId = await client.v1.uploadMedia(Buffer.from(screenshotBuffer), { mimeType: 'image/png' });
        console.log(`✅ Media uploaded (Media ID: ${mediaId})`);

        // 4. Post Tweet
        const replyToId = process.env.TWITTER_REPLY_TO_ID || DEFAULT_REPLY_TO_ID;
        const tweetLabel = `${fromDate} to ${toDate}`;
        const tweetText = asString(getRequestValue(req, 'tweetText')) || (isResumeMode ? `Resume Update: ${tweetLabel}` : `Daily Update: ${new Date().toLocaleDateString()}`);
        const shouldReply = !isResumeMode && asString(getRequestValue(req, 'reply')).toLowerCase() !== 'false' && asString(getRequestValue(req, 'replyToId') ?? replyToId) !== '';
        const effectiveReplyToId = asString(getRequestValue(req, 'replyToId')) || replyToId;

        console.log(shouldReply ? `💬 Replying to Tweet ID: ${effectiveReplyToId}` : '💬 Posting standalone tweet...');

        const mediaIds = [mediaId] as [string];
        const tweetPayload = {
            text: tweetText,
            media: { media_ids: mediaIds },
        };

        if (shouldReply) {
            try {
                await client.v2.tweet({
                    ...tweetPayload,
                    reply: { in_reply_to_tweet_id: effectiveReplyToId }
                });
            } catch (tweetError) {
                if (!shouldFallbackToStandaloneTweet(tweetError)) {
                    throw tweetError;
                }

                console.warn('⚠ Reply failed, posting standalone tweet instead:', tweetError);
                await client.v1.tweet(tweetText, { media_ids: mediaIds });
            }
        } else {
            await client.v1.tweet(tweetText, { media_ids: mediaIds });
        }

        console.log('✅ Tweet posted successfully!');

        res.status(200).json({
            success: true,
            message: 'Screenshot taken and tweet posted successfully.',
            mode: isResumeMode ? 'resume' : 'daily',
            fromDate,
            toDate,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error in captureAndTweet:', error);
        res.status(500).json({
            success: false,
            error: (error as any).message
        });
    } finally {
        if (browser) {
            await browser.close();
        }
    }
};
