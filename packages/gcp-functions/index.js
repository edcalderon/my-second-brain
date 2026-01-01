const { Firestore } = require('@google-cloud/firestore');
const { Storage } = require('@google-cloud/storage');
const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const { VertexAI } = require('@google-cloud/vertexai');
const nodemailer = require('nodemailer');

// 1. Initial State & Configuration
// These are fallback defaults; preferably passed via Environment Variables
const PROJECT_ID = process.env.GCP_PROJECT_ID || 'second-brain-482901';
const BUCKET_NAME = process.env.GCP_BUCKET_NAME || `rocketbook-habit-tracker-${PROJECT_ID}`;
const COLLECTION = 'knowledge_base';

const firestore = new Firestore({ projectId: PROJECT_ID });
const storage = new Storage({ projectId: PROJECT_ID });

// Initialize Vertex AI for Agentic Structuring
const vertexAI = new VertexAI({ project: PROJECT_ID, location: 'us-central1' });
const model = vertexAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

const transporter = nodemailer.createTransporter({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
    }
});

/**
 * MAIN ENTRY POINT: Triggered via Cloud Scheduler (or HTTP for testing)
 */
exports.fetchFromHostinger = async (req, res) => {
    console.log('🚀 Starting Hostinger IMAP Fetch...');

    const client = new ImapFlow({
        host: process.env.IMAP_HOST || 'imap.hostinger.com',
        port: 993,
        secure: true,
        auth: {
            user: process.env.IMAP_USER,
            pass: process.env.IMAP_PASSWORD
        },
        logger: false
    });

    try {
        await client.connect();

        // Get list of all mailboxes
        const mailboxes = await client.list();
        console.log('📬 Available mailboxes:', mailboxes.map(m => m.path).join(', '));

        let totalProcessed = 0;

        for (const mailbox of mailboxes) {
            console.log(`🔍 Checking mailbox: ${mailbox.path}`);
            let lock;
            try {
                lock = await client.getMailboxLock(mailbox.path);
                const messages = await client.search({
                    from: 'notes@email.getrocketbook.com',
                    unseen: true
                });

                if (messages.length > 0) {
                    console.log(`📩 Found ${messages.length} unread emails in ${mailbox.path}.`);

                    for (const uid of messages) {
                        let { content } = await client.download(uid);
                        let parsed = await simpleParser(content);

                        const transcriptionAttachment = parsed.attachments.find(att =>
                            att.filename && (att.filename.includes('transcription') || att.filename.endsWith('.txt'))
                        );

                        if (transcriptionAttachment) {
                            const rawText = transcriptionAttachment.content.toString('utf-8');
                            const subject = parsed.subject || 'Rocketbook Scan';
                            const date = parsed.date || new Date();

                            console.log(`📄 Processing: ${transcriptionAttachment.filename} from ${subject}`);

                            const structuredData = await structureWithAI(rawText, subject);

                            await archiveToKnowledgeBase({
                                rawText,
                                structuredData,
                                filename: transcriptionAttachment.filename,
                                subject,
                                date,
                                messageId: parsed.messageId
                            });

                            await sendEntranceNotification({
                                filename: transcriptionAttachment.filename,
                                subject,
                                structuredData
                            });

                            await client.messageFlagsAdd(uid, ['\\Seen']);
                            totalProcessed++;
                        }
                    }
                }
            } catch (e) {
                console.log(`⚠️  Skipping ${mailbox.path}: ${e.message}`);
            } finally {
                if (lock) lock.release();
            }
        }

        res.status(200).send(`Successfully processed ${totalProcessed} new notes across all folders.`);

    } catch (error) {
        console.error('❌ IMAP Error:', error);
        res.status(500).send(`Error: ${error.message}`);
    } finally {
        await client.logout();
    }
};

// End of fetchFromHostinger

async function sendEntranceNotification({ filename, subject, structuredData }) {
    if (!process.env.NOTIFICATION_EMAIL) {
        console.log('⚠️  No notification email configured, skipping notification');
        return;
    }

    const mailOptions = {
        from: process.env.SMTP_USER,
        to: process.env.NOTIFICATION_EMAIL,
        subject: `📬 New Rocketbook Note: ${subject}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
                    🚀 New Entrance Detected
                </h2>
                
                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
                    <h3 style="color: #495057; margin-top: 0;">📝 Note Details</h3>
                    <p><strong>Filename:</strong> ${filename}</p>
                    <p><strong>Subject:</strong> ${subject}</p>
                    <p><strong>Processed at:</strong> ${new Date().toISOString()}</p>
                </div>

                <div style="background-color: #e7f3ff; padding: 15px; border-radius: 5px; margin: 15px 0;">
                    <h3 style="color: #0066cc; margin-top: 0;">📋 Summary</h3>
                    <p>${structuredData.summary}</p>
                </div>

                ${structuredData.action_items && structuredData.action_items.length > 0 ? `
                <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 15px 0;">
                    <h3 style="color: #856404; margin-top: 0;">⚡ Action Items</h3>
                    <ul style="margin: 0; padding-left: 20px;">
                        ${structuredData.action_items.map(item => `<li>${item}</li>`).join('')}
                    </ul>
                </div>
                ` : ''}

                ${structuredData.tags && structuredData.tags.length > 0 ? `
                <div style="margin: 15px 0;">
                    <h3 style="color: #333;">🏷️ Tags</h3>
                    <div style="display: flex; flex-wrap: wrap; gap: 5px;">
                        ${structuredData.tags.map(tag => `<span style="background-color: #007bff; color: white; padding: 3px 8px; border-radius: 12px; font-size: 12px;">#${tag}</span>`).join('')}
                    </div>
                </div>
                ` : ''}

                <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #dee2e6; color: #6c757d; font-size: 12px;">
                    <p>This notification was sent automatically when a new Rocketbook note was processed from edward@lsts.tech</p>
                </div>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ Email notification sent to ${process.env.NOTIFICATION_EMAIL}`);
    } catch (error) {
        console.error('❌ Failed to send email notification:', error);
    }
}

/**
 * AGENTIC STEP: Uses Gemini to turn messy OCR into high-quality Knowledge Base entry
 */
async function structureWithAI(rawText, subject) {
    console.log('🤖 AI is structuring the note...');

    const prompt = `
        You are an expert knowledge management assistant. 
        I am giving you a raw OCR transcription from a Rocketbook handwritten note.
        Subject: ${subject}
        Raw Text:
        ---
        ${rawText}
        ---
        
        Tasks:
        1. Fix any obvious OCR handwriting recognition errors.
        2. Identify the main topic or title.
        3. Extract a concise summary (max 3 sentences).
        4. List key bullet points or "Action Items" found in the text.
        5. Provide a list of 3-5 relevant hashtags for organization.
        
        Return ONLY a JSON object with these keys: 
        "clean_text", "title", "summary", "action_items", "tags"
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text().replace(/```json|```/g, '').trim();
        return JSON.parse(text);
    } catch (error) {
        console.error('AI Structuring failed, falling back to raw:', error);
        return {
            clean_text: rawText,
            title: subject,
            summary: "AI processing failed.",
            action_items: [],
            tags: ["rocketbook", "raw"]
        };
    }
}

/**
 * ARCHIVE STEP: Saves to Firestore & Cloud Storage
 */
async function archiveToKnowledgeBase({ rawText, structuredData, filename, subject, date, messageId }) {
    const entryId = `rb_${Date.now()}`;

    // 1. Save Raw to Storage
    const bucket = storage.bucket(BUCKET_NAME);
    const file = bucket.file(`archive/${entryId}_raw.txt`);
    await file.save(rawText, { contentType: 'text/plain' });

    // 2. Save Structured to Firestore
    const docRef = firestore.collection(COLLECTION).doc(entryId);
    await docRef.set({
        id: entryId,
        metadata: {
            original_filename: filename,
            gmail_subject: subject,
            received_at: date.toISOString(),
            message_id: messageId,
            source: 'rocketbook_imap'
        },
        content: structuredData,
        raw_storage_path: `gs://${BUCKET_NAME}/archive/${entryId}_raw.txt`,
        created_at: new Date().toISOString()
    });

    console.log(`✅ Archived entry ${entryId} to Firestore and Storage.`);
}