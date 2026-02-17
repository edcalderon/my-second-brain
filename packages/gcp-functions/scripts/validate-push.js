const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔒 Starting Security & Analytics Check...');

// 1. Secret Scanning
console.log('\n🔍 Scanning for accidentally committed secrets...');
const secretPatterns = [
    /TWITTER_APP_KEY\s*=\s*['"][^'"]+['"]/,
    /TWITTER_ACCESS_TOKEN\s*=\s*['"][^'"]+['"]/,
    /["']AIzb[a-zA-Z0-9_-]{35}["']/, // Google API Key pattern
    /-----BEGIN PRIVATE KEY-----/
];

function scanDir(dir) {
    const files = fs.readdirSync(dir);
    let found = false;

    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            if (file !== 'node_modules' && file !== '.git' && file !== 'lib') {
                if (scanDir(fullPath)) found = true;
            }
        } else if (file.endsWith('.ts') || file.endsWith('.js') || file.endsWith('.json')) {
            const content = fs.readFileSync(fullPath, 'utf-8');
            for (const pattern of secretPatterns) {
                if (pattern.test(content)) {
                    // Ignore this file (the scanner itself)
                    if (fullPath.endsWith('validate-push.js')) continue;

                    console.error(`❌ POTENTIAL SECRET FOUND in ${fullPath}`);
                    console.error(`   Pattern matched: ${pattern}`);
                    found = true;
                }
            }
        }
    }
    return found;
}

if (scanDir(path.join(__dirname, '..', 'src'))) {
    console.error('⛔ Security check failed: Secrets detected in source code.');
    process.exit(1);
}
console.log('✅ No secrets found in src/');

// 2. Static Analysis (Linting)
console.log('\n🎨 Running Static Analysis (ESLint)...');
try {
    execSync('npm run lint', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    console.log('✅ Linting passed.');
} catch (e) {
    console.error('⛔ Linting failed.');
    process.exit(1);
}

// 3. Dependency Audit
console.log('\n🛡️  Running Dependency Vulnerability Check...');
try {
    // Audit production dependencies using pnpm for workspace compatibility
    execSync('pnpm audit --prod', { stdio: 'inherit', cwd: path.join(__dirname, '..', '..', '..') });
    console.log('✅ Security audit passed.');
} catch (e) {
    console.error('⛔ Security audit detected high vulnerability issues.');
    process.exit(1);
}

console.log('\n🎉 All checks passed! Ready to push.');
