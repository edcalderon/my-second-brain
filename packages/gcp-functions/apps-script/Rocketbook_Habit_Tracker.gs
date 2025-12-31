/**
 * Rocketbook Habit Tracker - Simple MVP
 * 
 * Automatically processes Rocketbook emails, saves transcription files to Drive,
 * and logs structured data to Google Sheets for Ignatian Examen habit tracking.
 * 
 * Author: Your AI Assistant
 * Version: 1.0
 */

// Configuration
const CONFIG = {
  GMAIL_LABEL: "Rocketbook",
  PROCESSED_LABEL: "Rocketbook/Processed",
  DRIVE_FOLDER: "Rocketbook/Transcriptions",
  SHEET_NAME: "Rocketbook Habit Log",
  SHEET_TAB: "entries"
};

/**
 * Main ingestion function - run this on a time trigger
 */
function ingestRocketbook() {
  try {
    Logger.log("Starting Rocketbook ingestion...");
    
    // Ensure labels exist
    ensureLabelsExist();
    
    // Get unread Rocketbook messages
    const threads = GmailApp.search(`label:${CONFIG.GMAIL_LABEL} is:unread has:attachment`);
    Logger.log(`Found ${threads.length} threads to process`);
    
    for (const thread of threads) {
      processThread(thread);
    }
    
    Logger.log("Ingestion completed");
  } catch (error) {
    Logger.log(`Error in ingestion: ${error.toString()}`);
    throw error;
  }
}

/**
 * Process a single Gmail thread
 */
function processThread(thread) {
  const messages = thread.getMessages();
  
  for (const message of messages) {
    if (message.isUnread()) {
      processMessage(message);
    }
  }
}

/**
 * Process a single Gmail message
 */
function processMessage(message) {
  try {
    const messageId = message.getId();
    const threadId = thread.getId();
    
    // Check if already processed
    if (isMessageProcessed(messageId)) {
      Logger.log(`Message ${messageId} already processed, skipping`);
      return;
    }
    
    Logger.log(`Processing message: ${message.getSubject()}`);
    
    // Get transcription attachment
    const transcriptionAttachment = findTranscriptionAttachment(message);
    if (!transcriptionAttachment) {
      Logger.log(`No transcription attachment found in message ${messageId}`);
      return;
    }
    
    // Save to Drive
    const driveFile = saveToDrive(transcriptionAttachment, message.getDate());
    if (!driveFile) {
      Logger.log(`Failed to save attachment to Drive`);
      return;
    }
    
    // Get text content
    const rawText = transcriptionAttachment.getDataAsString();
    
    // Parse structured data
    const parsedData = parseTranscriptionText(rawText);
    
    // Log to spreadsheet
    logToSheet({
      entry_id: Utilities.getUuid(),
      received_at: message.getDate().toISOString(),
      gmail_thread_id: threadId,
      gmail_message_id: messageId,
      from: message.getFrom(),
      subject: message.getSubject(),
      attachment_name: transcriptionAttachment.getName(),
      drive_file_url: driveFile.getUrl(),
      raw_text: rawText,
      parsed_json: JSON.stringify(parsedData)
    });
    
    // Mark as processed
    message.markRead();
    GmailApp.getUserLabelByName(CONFIG.PROCESSED_LABEL).addToThread(thread);
    
    Logger.log(`Successfully processed message ${messageId}`);
    
  } catch (error) {
    Logger.log(`Error processing message: ${error.toString()}`);
  }
}

/**
 * Find the transcription attachment (ends with -transcription-beta.txt)
 */
function findTranscriptionAttachment(message) {
  const attachments = message.getAttachments();
  
  for (const attachment of attachments) {
    if (attachment.getName().endsWith('-transcription-beta.txt')) {
      return attachment;
    }
  }
  
  return null;
}

/**
 * Save attachment to Google Drive with organized folder structure
 */
function saveToDrive(attachment, date) {
  try {
    // Create folder structure: Rocketbook/Transcriptions/YYYY/MM/
    const year = date.getFullYear().toString();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    
    const folderPath = `${CONFIG.DRIVE_FOLDER}/${year}/${month}`;
    let folder = DriveApp.getFoldersByName(CONFIG.DRIVE_FOLDER).hasNext() 
      ? DriveApp.getFoldersByName(CONFIG.DRIVE_FOLDER).next()
      : DriveApp.createFolder(CONFIG.DRIVE_FOLDER);
    
    // Navigate/create year folder
    if (!folder.getFoldersByName(year).hasNext()) {
      folder = folder.createFolder(year);
    } else {
      folder = folder.getFoldersByName(year).next();
    }
    
    // Navigate/create month folder
    if (!folder.getFoldersByName(month).hasNext()) {
      folder = folder.createFolder(month);
    } else {
      folder = folder.getFoldersByName(month).next();
    }
    
    // Save file
    const file = folder.createFile(attachment);
    Logger.log(`Saved to Drive: ${file.getUrl()}`);
    
    return file;
    
  } catch (error) {
    Logger.log(`Error saving to Drive: ${error.toString()}`);
    return null;
  }
}

/**
 * Parse transcription text for Ignatian Examen structure
 */
function parseTranscriptionText(text) {
  const result = {
    wrong: [],
    good: [],
    forgot: [],
    raw: text,
    source: "rocketbook"
  };
  
  try {
    // Split into lines and clean up
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    let currentSection = null;
    
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      
      // Detect section headers
      if (lowerLine.includes('wrong') && lowerLine.includes('do')) {
        currentSection = 'wrong';
        continue;
      } else if (lowerLine.includes('good') && lowerLine.includes('accomplish')) {
        currentSection = 'good';
        continue;
      } else if (lowerLine.includes('forget') || lowerLine.includes('fail')) {
        currentSection = 'forgot';
        continue;
      }
      
      // Extract bullet points
      if ((line.startsWith('-') || line.startsWith('•') || line.startsWith('*')) && currentSection) {
        const item = line.substring(1).trim();
        if (item.length > 0) {
          result[currentSection].push(item);
        }
      } else if (currentSection && line.length > 0 && !line.toLowerCase().includes('what')) {
        // Also capture non-bullet lines as items (in case Rocketbook format varies)
        result[currentSection].push(line);
      }
    }
    
  } catch (error) {
    Logger.log(`Error parsing text: ${error.toString()}`);
    // Return empty arrays if parsing fails, but keep raw text
  }
  
  return result;
}

/**
 * Log entry to Google Sheet
 */
function logToSheet(data) {
  try {
    let spreadsheet = SpreadsheetApp.openByName(CONFIG.SHEET_NAME);
    if (!spreadsheet) {
      spreadsheet = SpreadsheetApp.create(CONFIG.SHEET_NAME);
      Logger.log(`Created new spreadsheet: ${CONFIG.SHEET_NAME}`);
    }
    
    let sheet = spreadsheet.getSheetByName(CONFIG.SHEET_TAB);
    if (!sheet) {
      sheet = spreadsheet.insertSheet(CONFIG.SHEET_TAB);
      setupSheetHeader(sheet);
    }
    
    // Append row
    sheet.appendRow([
      data.entry_id,
      data.received_at,
      data.gmail_thread_id,
      data.gmail_message_id,
      data.from,
      data.subject,
      data.attachment_name,
      data.drive_file_url,
      data.raw_text,
      data.parsed_json
    ]);
    
    Logger.log(`Logged entry to sheet: ${data.entry_id}`);
    
  } catch (error) {
    Logger.log(`Error logging to sheet: ${error.toString()}`);
  }
}

/**
 * Setup sheet header row
 */
function setupSheetHeader(sheet) {
  const headers = [
    'entry_id',
    'received_at', 
    'gmail_thread_id',
    'gmail_message_id',
    'from',
    'subject',
    'attachment_name',
    'drive_file_url',
    'raw_text',
    'parsed_json'
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers])
       .setFontWeight('bold')
       .setBackground('#f3f3f3');
  
  // Auto-resize columns
  sheet.autoResizeColumns(1, headers.length);
}

/**
 * Check if message was already processed
 */
function isMessageProcessed(messageId) {
  try {
    let spreadsheet = SpreadsheetApp.openByName(CONFIG.SHEET_NAME);
    if (!spreadsheet) return false;
    
    const sheet = spreadsheet.getSheetByName(CONFIG.SHEET_TAB);
    if (!sheet) return false;
    
    const data = sheet.getDataRange().getValues();
    const messageIdColumn = 3; // gmail_message_id column (0-indexed: 3)
    
    for (let i = 1; i < data.length; i++) { // Skip header row
      if (data[i][messageIdColumn] === messageId) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    Logger.log(`Error checking processed status: ${error.toString()}`);
    return false;
  }
}

/**
 * Ensure Gmail labels exist
 */
function ensureLabelsExist() {
  try {
    // Main label
    if (!GmailApp.getUserLabelByName(CONFIG.GMAIL_LABEL)) {
      GmailApp.createLabel(CONFIG.GMAIL_LABEL);
      Logger.log(`Created label: ${CONFIG.GMAIL_LABEL}`);
    }
    
    // Processed label
    if (!GmailApp.getUserLabelByName(CONFIG.PROCESSED_LABEL)) {
      GmailApp.createLabel(CONFIG.PROCESSED_LABEL);
      Logger.log(`Created label: ${CONFIG.PROCESSED_LABEL}`);
    }
  } catch (error) {
    Logger.log(`Error creating labels: ${error.toString()}`);
  }
}

/**
 * Test function - run this manually to test setup
 */
function testIngestion() {
  Logger.log("Running test ingestion...");
  ingestRocketbook();
  Logger.log("Test completed");
}

/**
 * Setup function - run once to initialize
 */
function setupRocketbookTracker() {
  Logger.log("Setting up Rocketbook tracker...");
  
  // Create labels
  ensureLabelsExist();
  
  // Create spreadsheet
  let spreadsheet = SpreadsheetApp.openByName(CONFIG.SHEET_NAME);
  if (!spreadsheet) {
    spreadsheet = SpreadsheetApp.create(CONFIG.SHEET_NAME);
    const sheet = spreadsheet.insertSheet(CONFIG.SHEET_TAB);
    setupSheetHeader(sheet);
    Logger.log(`Created spreadsheet: ${CONFIG.SHEET_NAME}`);
  } else {
    Logger.log(`Spreadsheet already exists: ${CONFIG.SHEET_NAME}`);
  }
  
  // Create Drive folder
  if (!DriveApp.getFoldersByName(CONFIG.DRIVE_FOLDER).hasNext()) {
    DriveApp.createFolder(CONFIG.DRIVE_FOLDER);
    Logger.log(`Created Drive folder: ${CONFIG.DRIVE_FOLDER}`);
  } else {
    Logger.log(`Drive folder already exists: ${CONFIG.DRIVE_FOLDER}`);
  }
  
  Logger.log("Setup completed!");
}