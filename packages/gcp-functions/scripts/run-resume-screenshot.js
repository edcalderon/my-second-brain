// One-time resume tweet runner for a catch-up post.
// Use this to post a graph for a custom date range, e.g. 2026-02-27 -> 2026-03-28.
const { captureAndTweet } = require('../lib/handlers/githubScreenshot');

const fromDate = process.env.FROM_DATE || '2026-02-27';
const toDate = process.env.TO_DATE || '2026-03-28';

const req = {
    method: 'POST',
    body: {
        mode: 'resume',
        fromDate,
        toDate,
        reply: 'false',
        tweetText: process.env.TWEET_TEXT || `Resume Update: ${fromDate} to ${toDate}`,
    },
    query: {},
};

const res = {
    status(code) {
        console.log(`\n[Response Status]: ${code}`);
        return this;
    },
    json(data) {
        console.log('[Response Data]:');
        console.log(JSON.stringify(data, null, 2));
        return this;
    },
};

console.log('🚀 Starting one-time resume tweet...');
console.log(`Range: ${fromDate} -> ${toDate}`);

captureAndTweet(req, res)
    .then(() => {
        console.log('✅ Resume tweet runner finished');
    })
    .catch((error) => {
        console.error('❌ Resume tweet runner failed:', error);
        process.exitCode = 1;
    });