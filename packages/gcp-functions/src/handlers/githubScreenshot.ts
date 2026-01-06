import puppeteer from 'puppeteer';
import { TwitterApi } from 'twitter-api-v2';
import * as functions from 'firebase-functions';
import { Storage } from '@google-cloud/storage';

const storage = new Storage();
const BUCKET_NAME = process.env.GCP_BUCKET_NAME || 'second-brain-screenshots';

// Environment variables
const GITHUB_URL = process.env.GITHUB_PAGE_URL || 'https://github.com/edcalderon';
// The specific tweet ID to reply to. Can be overridden by env var.
const DEFAULT_REPLY_TO_ID = '2007025581188436301';

/**
 * Captures a screenshot of the specified GitHub page contribution graph and posts it as a reply to a tweet.
 */
export const captureAndTweet = async (req: any, res: any) => {
    console.log('📸 Starting GitHub Custom Screenshot & Reply process...');

    // 1. Validate Twitter Config
    if (!process.env.TWITTER_APP_KEY || !process.env.TWITTER_ACCESS_TOKEN) {
        console.error('❌ Missing Twitter API credentials.');
        return res.status(500).json({ error: 'Missing Twitter configuration.' });
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

        // Dynamic date range for the current year (YYYY-01-01 to YYYY-MM-DD)
        // The user's request was specific: "2026-01-01 to 2026-01-05" but implies "current contributions of 2026".
        // We will target the current year view to make it robust for daily runs.
        const currentYear = new Date().getFullYear();
        const fromDate = `${currentYear}-01-01`;
        const toDate = new Date().toISOString().split('T')[0]; // Current date

        // Construct URL to force the contribution view for the current year
        const targetUrl = `${GITHUB_URL}?tab=overview&from=${fromDate}&to=${toDate}`;
        console.log(`🌐 Navigating to ${targetUrl}...`);

        await page.goto(targetUrl, { waitUntil: 'networkidle2' });

        // Selector for the "Contributions in 2026" section
        // We look for the main contribution graph container. 
        // The class 'js-yearly-contributions' usually wraps the graph + header.
        const selector = '.js-yearly-contributions';

        try {
            await page.waitForSelector(selector, { timeout: 10000 });
        } catch (e) {
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
            const dateStr = new Date().toISOString().split('T')[0];
            const fileName = `github-screenshots/${dateStr}.png`;
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

        // 4. Post Reply
        const replyToId = process.env.TWITTER_REPLY_TO_ID || DEFAULT_REPLY_TO_ID;
        const dateStr = new Date().toLocaleDateString();

        console.log(`💬 Replying to Tweet ID: ${replyToId}`);

        await client.v2.tweet({
            text: `Daily Update: ${dateStr}`,
            media: { media_ids: [mediaId] },
            reply: { in_reply_to_tweet_id: replyToId }
        });

        console.log('✅ Reply posted successfully!');

        res.status(200).json({
            success: true,
            message: 'Screenshot taken and reply posted successfully.',
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
