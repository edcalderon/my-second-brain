const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
const yamlPath = path.join(__dirname, '..', 'env.yaml');

if (!fs.existsSync(envPath)) {
    console.error('.env file not found');
    process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf-8');
const lines = envContent.split('\n');

let yamlContent = '';

lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
        const firstEq = trimmed.indexOf('=');
        if (firstEq > -1) {
            const key = trimmed.substring(0, firstEq).trim();
            let val = trimmed.substring(firstEq + 1).trim();

            // Basic yaml escaping if needed, but usually just stripping quotes
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                val = val.substring(1, val.length - 1);
            }

            yamlContent += `${key}: "${val}"\n`;
        }
    }
});

fs.writeFileSync(yamlPath, yamlContent);
console.log('Converted .env to env.yaml');
