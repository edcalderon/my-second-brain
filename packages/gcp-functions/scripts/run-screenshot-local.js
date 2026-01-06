
// Simple local test runner for the screenshot function
const { captureAndTweet } = require('../lib/handlers/githubScreenshot');

console.log("Debug: Checking Env Vars...");
console.log("TWITTER_APP_KEY:", process.env.TWITTER_APP_KEY ? "Set" : "Unset");
console.log("TWITTER_ACCESS_TOKEN:", process.env.TWITTER_ACCESS_TOKEN ? "Set" : "Unset");

console.log("TWITTER_APP_KEY:", process.env.TWITTER_APP_KEY ? "Set" : "Unset");
console.log("TWITTER_ACCESS_TOKEN:", process.env.TWITTER_ACCESS_TOKEN ? "Set" : "Unset");

// Enable local saving
process.env.SAVE_LOCAL_SCREENSHOT = 'true';

// Mock Express Request/Response
const req = {
    body: {
        trigger: 'local-test'
    }
};

const res = {
    status: function (code) {
        console.log(`\n[Response Status]: ${code}`);
        return this;
    },
    json: function (data) {
        console.log('[Response Data]:');
        console.log(JSON.stringify(data, null, 2));
        return this;
    }
};

console.log("🚀 Starting Local Test of captureAndTweet...");
console.log("-------------------------------------------");

captureAndTweet(req, res)
    .then(() => {
        console.log("-------------------------------------------");
        console.log("✅ Test Execution Finished");
    })
    .catch(err => {
        console.error("❌ Test Failed:", err);
    });
