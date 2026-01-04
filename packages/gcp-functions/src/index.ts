/**
 * GCP Cloud Functions - Cloned from Next.js API routes
 * These functions mirror the Next.js API routes for production deployment
 */

import * as functions from 'firebase-functions';
import { Request, Response } from 'express';
import { Firestore } from '@google-cloud/firestore';
import { Storage } from '@google-cloud/storage';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { VertexAI } from '@google-cloud/vertexai';
import nodemailer from 'nodemailer';

// Import route handlers from dashboard
// In production, these would be compiled and bundled
import { handleKnowledge } from './handlers/knowledge';
import { handleSync } from './handlers/sync';
import { handleStatus } from './handlers/status';

// CORS configuration
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handle CORS preflight
const handleCors = (req: Request, res: Response) => {
  if (req.method === 'OPTIONS') {
    res.set(corsHeaders);
    res.status(204).send('');
    return true;
  }
  res.set(corsHeaders);
  return false;
};

// Knowledge endpoint
export const knowledge = functions.https.onRequest(async (req, res) => {
  if (handleCors(req, res)) return;
  
  try {
    await handleKnowledge(req, res);
  } catch (error) {
    console.error('Knowledge function error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Sync endpoint
export const sync = functions.https.onRequest(async (req, res) => {
  if (handleCors(req, res)) return;
  
  try {
    await handleSync(req, res);
  } catch (error) {
    console.error('Sync function error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Status endpoint
export const status = functions.https.onRequest(async (req, res) => {
  if (handleCors(req, res)) return;
  
  try {
    await handleStatus(req, res);
  } catch (error) {
    console.error('Status function error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Configuration for Rocketbook IMAP Fetch
const PROJECT_ID = process.env.GCP_PROJECT_ID || 'your-project-id';
const BUCKET_NAME = process.env.GCP_BUCKET_NAME || `rocketbook-habit-tracker-${PROJECT_ID}`;
const COLLECTION = 'knowledge_base';

const firestore = new Firestore({ projectId: PROJECT_ID });
const storage = new Storage({ projectId: PROJECT_ID });

// Initialize Vertex AI for Agentic Structuring
const vertexAI = new VertexAI({ project: PROJECT_ID, location: 'us-central1' });
const model = vertexAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
});

// Rocketbook IMAP Fetch function
export const rocketbookFetch = functions.https.onRequest(async (req, res) => {
  const startTime = Date.now();
  console.log('🚀 Starting Hostinger IMAP Fetch...');
  
  const body = req.body || {};
  const { force = false, trigger = 'scheduled' } = body;

  const client = new ImapFlow({
    host: process.env.IMAP_HOST || 'imap.hostinger.com',
    port: 993,
    secure: true,
    auth: {
      user: process.env.IMAP_USER || '',
      pass: process.env.IMAP_PASSWORD || ''
    },
    logger: false
  });

  try {
    await client.connect();

    // Get list of all mailboxes
    const mailboxes = await client.list();
    console.log('📬 Available mailboxes:', mailboxes.map((m: any) => m.path).join(', '));

    let totalProcessed = 0;
    let totalFailed = 0;
    const failedEmails: any[] = [];

    for (const mailbox of mailboxes) {
      console.log(`🔍 Checking mailbox: ${mailbox.path}`);
      let lock;
      try {
        lock = await client.getMailboxLock(mailbox.path);
        
        const searchCriteria = force 
          ? { from: 'notes@email.getrocketbook.com' }
          : { from: 'notes@email.getrocketbook.com', unseen: true };
        
        const messages = await client.search(searchCriteria);
        const messageList = Array.isArray(messages) ? messages : [];

        if (messageList.length > 0) {
          console.log(`📩 Found ${messageList.length} emails in ${mailbox.path} (${trigger}, force: ${force}).`);

          for (const uid of messageList) {
            try {
              let { content } = await client.download(uid);
              let parsed = await simpleParser(content);

              const transcriptionAttachments = parsed.attachments.filter((att: any) =>
                att.filename && (att.filename.includes('transcription') || att.filename.endsWith('.txt'))
              );

              if (transcriptionAttachments.length > 0) {
                const subject = parsed.subject || 'Rocketbook Scan';
                const date = parsed.date || new Date();

                console.log(`📄 Processing ${transcriptionAttachments.length} attachments from ${subject}`);

                for (const transcriptionAttachment of transcriptionAttachments) {
                  try {
                    const rawText = transcriptionAttachment.content.toString('utf-8');

                    console.log(`📄 Processing: ${transcriptionAttachment.filename}`);

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

                    totalProcessed++;
                  } catch (attachmentError) {
                    console.error(`❌ Failed to process attachment ${(transcriptionAttachment as any).filename}:`, attachmentError);
                    totalFailed++;
                    failedEmails.push({
                      messageId: parsed.messageId,
                      subject,
                      filename: (transcriptionAttachment as any).filename,
                      error: (attachmentError as any).message
                    });
                  }
                }

                // Marcar como leído
                await client.messageFlagsAdd(uid, ['\\Seen']);

                // Mover email a Archives/rocketbook si está en Junk
                if (mailbox.path === 'INBOX.Junk') {
                  try {
                    await client.messageMove(uid, 'INBOX.Archives.rocketbook');
                    console.log(`✅ Moved email from Junk to Archives/rocketbook`);
                  } catch (moveError) {
                    console.warn(`⚠️ Failed to move email to Archives/rocketbook: ${(moveError as any).message}`);
                    // Continuar aunque falle el movimiento
                  }
                }
              } else {
                const subject = parsed.subject || 'Rocketbook Scan';
                console.log(`⚠️ No transcription attachments found in: ${subject}`);
              }
            } catch (emailError) {
              console.error(`❌ Failed to process email UID ${uid}:`, emailError);
              totalFailed++;
              failedEmails.push({
                uid,
                error: (emailError as any).message
              });
            }
          }
        } else {
          console.log(`📭 No matching emails found in ${mailbox.path}`);
        }
      } catch (e) {
        console.error(`❌ Error processing mailbox ${mailbox.path}:`, e);
      } finally {
        if (lock) lock.release();
      }
    }

    const duration = Date.now() - startTime;
    const result = {
      success: true,
      message: `Processed ${totalProcessed} notes, ${totalFailed} failed`,
      totalProcessed,
      totalFailed,
      duration: `${duration}ms`,
      trigger,
      force,
      failedEmails: failedEmails.slice(0, 10),
      timestamp: new Date().toISOString()
    };

    console.log(`✅ IMAP Fetch completed: ${result.message} (${duration}ms)`);
    res.status(200).json(result);

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('❌ IMAP Error:', error);
    res.status(500).json({
      success: false,
      error: (error as any).message,
      duration: `${duration}ms`,
      trigger,
      timestamp: new Date().toISOString()
    });
  } finally {
    await client.logout();
  }
});

// Helper functions
async function sendEntranceNotification({ filename, subject, structuredData }: any) {
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
            ${structuredData.action_items.map((item: string) => `<li>${item}</li>`).join('')}
          </ul>
        </div>
        ` : ''}

        ${structuredData.tags && structuredData.tags.length > 0 ? `
        <div style="margin: 15px 0;">
          <h3 style="color: #333;">🏷️ Tags</h3>
          <div style="display: flex; flex-wrap: wrap; gap: 5px;">
            ${structuredData.tags.map((tag: string) => `<span style="background-color: #007bff; color: white; padding: 3px 8px; border-radius: 12px; font-size: 12px;">#${tag}</span>`).join('')}
          </div>
        </div>
        ` : ''}

        <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #dee2e6; color: #6c757d; font-size: 12px;">
          <p>This notification was sent automatically when a new Rocketbook note was processed.</p>
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

async function structureWithAI(rawText: string, subject: string) {
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
    const text = (response as any).text().replace(/```json|```/g, '').trim();
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

async function archiveToKnowledgeBase({ rawText, structuredData, filename, subject, date, messageId }: any) {
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
