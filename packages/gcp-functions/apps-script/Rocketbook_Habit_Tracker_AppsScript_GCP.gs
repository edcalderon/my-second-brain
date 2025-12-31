/**
 * Rocketbook Habit Tracker - Apps Script with GCP Integration
 * 
 * This version calls your deployed Cloud Functions instead of using
 * Google Drive/Sheets directly, providing enterprise-grade infrastructure.
 * 
 * Replace YOUR_WEBHOOK_URL below after deploying Cloud Functions.
 */

// Configuration - UPDATE THIS AFTER GCP DEPLOYMENT
const GCP_WEBHOOK_URL = "https://your-region-your-project-id.cloudfunctions.net/rocketbook-webhook";
const GCP_INSIGHTS_URL = "https://your-region-your-project-id.cloudfunctions.net/rocketbook-insights";
const GMAIL_LABEL = "Rocketbook";
const PROCESSED_LABEL = "Rocketbook/Processed";

/**
 * Main ingestion function - calls GCP Cloud Function
 */
function ingestRocketbook() {
  try {
    Logger.log("Starting GCP-powered Rocketbook ingestion...");
    
    ensureLabelsExist();
    
    const threads = GmailApp.search(`label:${GMAIL_LABEL} is:unread has:attachment`);
    Logger.log(`Found ${threads.length} threads to process`);
    
    for (const thread of threads) {
      processThreadWithGCP(thread);
    }
    
    Logger.log("GCP Ingestion completed");
  } catch (error) {
    Logger.log(`Error in GCP ingestion: ${error.toString()}`);
  }
}

/**
 * Process thread by calling GCP Cloud Function
 */
function processThreadWithGCP(thread) {
  const messages = thread.getMessages();
  
  for (const message of messages) {
    if (message.isUnread()) {
      processMessageWithGCP(message);
    }
  }
}

/**
 * Process message by sending to Cloud Function
 */
function processMessageWithGCP(message) {
  try {
    const messageId = message.getId();
    const threadId = thread.getId();
    
    Logger.log(`Processing message with GCP: ${message.getSubject()}`);
    
    // Get transcription attachment
    const transcriptionAttachment = findTranscriptionAttachment(message);
    if (!transcriptionAttachment) {
      Logger.log(`No transcription attachment found in message ${messageId}`);
      return;
    }
    
    // Prepare payload for Cloud Function
    const payload = {
      messageId: messageId,
      threadId: threadId,
      subject: message.getSubject(),
      from: message.getFrom(),
      date: message.getDate().toISOString(),
      attachmentContent: transcriptionAttachment.getDataAsString(),
      attachmentName: transcriptionAttachment.getName()
    };
    
    // Call Cloud Function
    const response = UrlFetchApp.fetch(GCP_WEBHOOK_URL, {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      headers: {
        'User-Agent': 'Google-Apps-Script-Rocketbook/1.0'
      },
      muteHttpExceptions: false
    });
    
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    if (responseCode === 200) {
      Logger.log(`Successfully processed message ${messageId} via GCP`);
      
      // Mark as processed
      message.markRead();
      GmailApp.getUserLabelByName(PROCESSED_LABEL).addToThread(thread);
    } else {
      Logger.log(`Cloud Function error for message ${messageId}: ${responseCode} ${responseText}`);
    }
    
  } catch (error) {
    Logger.log(`Error processing message with GCP: ${error.toString()}`);
  }
}

/**
 * Get habit insights from GCP
 */
function getHabitInsights(timeframe = '30d') {
  try {
    const url = `${GCP_INSIGHTS_URL}?timeframe=${timeframe}`;
    
    const response = UrlFetchApp.fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Google-Apps-Script-Rocketbook/1.0'
      },
      muteHttpExceptions: false
    });
    
    if (response.getResponseCode() === 200) {
      const insights = JSON.parse(response.getContentText());
      Logger.log(`Retrieved insights: ${JSON.stringify(insights)}`);
      return insights;
    } else {
      Logger.log(`Failed to get insights: ${response.getResponseCode()}`);
      return null;
    }
    
  } catch (error) {
    Logger.log(`Error getting insights: ${error.toString()}`);
    return null;
  }
}

/**
 * Create a simple dashboard in Google Sheet
 */
function createInsightsDashboard() {
  try {
    const insights = getHabitInsights('30d');
    if (!insights) return;
    
    // Create or open spreadsheet
    let spreadsheet = SpreadsheetApp.openByName("Rocketbook Insights Dashboard");
    if (!spreadsheet) {
      spreadsheet = SpreadsheetApp.create("Rocketbook Insights Dashboard");
    }
    
    // Clear and setup dashboard sheet
    let sheet = spreadsheet.getSheetByName("Dashboard");
    if (sheet) {
      sheet.clear();
    } else {
      sheet = spreadsheet.insertSheet("Dashboard");
    }
    
    // Write insights
    const headers = ['Metric', 'Count', 'Examples'];
    sheet.getRange(1, 1, 1, 3).setValues([headers]).setFontWeight('bold');
    
    let row = 2;
    
    // Top wrong habits
    sheet.getRange(row, 1).setValue('Top Wrong Habits');
    insights.insights.top_wrong.forEach(([habit, count]) => {
      sheet.getRange(row, 2).setValue(count);
      sheet.getRange(row, 3).setValue(habit);
      row++;
    });
    row++;
    
    // Top good habits  
    sheet.getRange(row, 1).setValue('Top Good Habits');
    insights.insights.top_good.forEach(([habit, count]) => {
      sheet.getRange(row, 2).setValue(count);
      sheet.getRange(row, 3).setValue(habit);
      row++;
    });
    row++;
    
    // Top forgot habits
    sheet.getRange(row, 1).setValue('Top Missed Actions');
    insights.insights.top_forgot.forEach(([habit, count]) => {
      sheet.getRange(row, 2).setValue(count);
      sheet.getRange(row, 3).setValue(habit);
      row++;
    });
    
    sheet.autoResizeColumns(1, 3);
    
    Logger.log(`Created insights dashboard: ${spreadsheet.getUrl()}`);
    return spreadsheet.getUrl();
    
  } catch (error) {
    Logger.log(`Error creating dashboard: ${error.toString()}`);
  }
}

/**
 * Test GCP integration
 */
function testGCPIntegration() {
  Logger.log("Testing GCP integration...");
  
  // Test webhook (sends test payload)
  const testPayload = {
    messageId: 'test-' + Date.now(),
    threadId: 'test-' + Date.now(),
    subject: 'Test Rocketbook Email',
    from: 'test@example.com',
    date: new Date().toISOString(),
    attachmentContent: 'What wrong did I do?\n- Test wrong\n\nWhat good did I accomplish?\n- Test good\n\nWhat did I forget to do?\n- Test forgot',
    attachmentName: 'test-transcription.txt'
  };
  
  try {
    const response = UrlFetchApp.fetch(GCP_WEBHOOK_URL, {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify(testPayload),
      muteHttpExceptions: false
    });
    
    Logger.log(`Webhook test response: ${response.getResponseCode()} ${response.getContentText()}`);
    
  } catch (error) {
    Logger.log(`Webhook test failed: ${error.toString()}`);
  }
  
  // Test insights
  const insights = getHabitInsights('7d');
  Logger.log(`Insights test response: ${JSON.stringify(insights)}`);
  
  Logger.log("GCP integration test completed");
}

/**
 * Setup function - run once to initialize
 */
function setupRocketbookGCP() {
  Logger.log("Setting up GCP Rocketbook tracker...");
  
  // Create labels
  ensureLabelsExist();
  
  // Create insights dashboard
  const dashboardUrl = createInsightsDashboard();
  Logger.log(`Dashboard created: ${dashboardUrl}`);
  
  Logger.log("GCP setup completed! Run testGCPIntegration() to verify.");
}

// Reuse existing helper function
function findTranscriptionAttachment(message) {
  const attachments = message.getAttachments();
  for (const attachment of attachments) {
    if (attachment.getName().endsWith('-transcription-beta.txt')) {
      return attachment;
    }
  }
  return null;
}

function ensureLabelsExist() {
  try {
    if (!GmailApp.getUserLabelByName(GMAIL_LABEL)) {
      GmailApp.createLabel(GMAIL_LABEL);
    }
    if (!GmailApp.getUserLabelByName(PROCESSED_LABEL)) {
      GmailApp.createLabel(PROCESSED_LABEL);
    }
  } catch (error) {
    Logger.log(`Error creating labels: ${error.toString()}`);
  }
}