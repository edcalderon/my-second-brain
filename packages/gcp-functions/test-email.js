const { sendEntranceNotification } = require('./index.js');

async function testEmailNotification() {
    console.log('🧪 Testing email notification functionality...');
    
    const testData = {
        filename: 'test_transcription.txt',
        subject: 'Test Rocketbook Note',
        structuredData: {
            summary: 'This is a test note for verifying email notifications work correctly.',
            action_items: [
                'Verify email sending works',
                'Check email formatting',
                'Confirm notifications arrive at destination'
            ],
            tags: ['test', 'rocketbook', 'notification']
        }
    };

    try {
        await sendEntranceNotification(testData);
        console.log('✅ Test email sent successfully!');
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testEmailNotification();