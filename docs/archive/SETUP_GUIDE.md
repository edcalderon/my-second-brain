# Rocketbook Habit Tracker Setup Guide

## Overview
This system automatically processes your Rocketbook emails and builds a structured database of your Ignatian Examen habit tracking.

## Step 1: Gmail Setup

### Create Gmail Filter
1. Open Gmail
2. Click the search bar and click "Show search options"
3. In the "From" field, enter: `notes@email.getrocketbook.com`
4. Click "Create filter"
5. Apply these actions:
   - ✅ Apply the label: `Rocketbook` (create this label if needed)
   - ✅ Skip the inbox (optional)
   - ✅ Mark as read (optional - the script will handle this)

### Create Labels
Create these labels in Gmail:
- `Rocketbook` (main label for unprocessed emails)
- `Rocketbook/Processed` (for completed emails)

## Step 2: Google Apps Script Setup

### Create Script Project
1. Go to [script.google.com](https://script.google.com)
2. Click "New Project"
3. Delete the default code
4. Copy and paste the entire `Rocketbook_Habit_Tracker.gs` code
5. Save the project (Name it "Rocketbook Habit Tracker")

### Set Permissions
1. Click "Review permissions" or "Authorization required"
2. Choose your Google account
3. Click "Advanced" then "Go to [project name] (unsafe)"
4. Click "Allow" for all requested permissions:
   - Gmail access
   - Drive access  
   - Sheets access

## Step 3: Initial Setup

1. In the Apps Script editor, select the `setupRocketbookTracker` function
2. Click "Run" 
3. Check the execution log to confirm everything was created

This creates:
- Gmail labels (if they don't exist)
- Google Sheet named "Rocketbook Habit Log"
- Drive folder structure: `Rocketbook/Transcriptions/`

## Step 4: Set Up Automatic Processing

### Create Time Trigger
1. In Apps Script editor, click the "Triggers" icon (alarm clock)
2. Click "Add Trigger"
3. Configure as follows:
   - Choose function: `ingestRocketbook`
   - Select event source: `Time-driven`
   - Type of time-based trigger: `Minutes timer`
   - Select minute interval: `Every 5 minutes`
   - Notification: `Receive notifications on failure`
4. Click "Save"

## Step 5: Test the System

### Manual Test
1. In Apps Script editor, select the `testIngestion` function
2. Click "Run"
3. Check the execution log for any errors
4. Verify the Google Sheet has new entries
5. Check Drive for saved transcription files

### Automated Test
1. Send a test Rocketbook email (or wait for your next one)
2. Wait 5-10 minutes for the trigger to run
3. Check:
   - Email is marked as processed (read + "Rocketbook/Processed" label)
   - New entry in Google Sheet
   - Transcription file saved in Drive folder

## Expected Results

### Google Sheet Structure
Your "Rocketbook Habit Log" sheet will have these columns:
- `entry_id`: Unique identifier
- `received_at`: Timestamp when email was received
- `gmail_thread_id`: Gmail thread identifier
- `gmail_message_id`: Gmail message identifier
- `from`: Sender email
- `subject`: Email subject
- `attachment_name`: Transcription filename
- `drive_file_url`: Link to saved file in Drive
- `raw_text`: Full transcription text
- `parsed_json`: Structured data with wrong/good/forgot arrays

### Drive Structure
```
Rocketbook/
└── Transcriptions/
    ├── 2025/
    │   ├── 01/
    │   ├── 02/
    │   └── ...
    └── 2026/
        └── ...
```

## Troubleshooting

### Common Issues

**"Permission denied" errors**
- Re-run the script and grant permissions again
- Make sure all checkboxes are checked when allowing access

**No emails being processed**
- Check that Gmail filter is applying the "Rocketbook" label correctly
- Verify emails are arriving from `notes@email.getrocketbook.com`
- Check execution log for error messages

**Google Sheet not updating**
- Ensure sheet is named exactly "Rocketbook Habit Log"
- Check that the "entries" tab exists
- Verify the script has permission to access Sheets

**Drive files not saving**
- Check Drive quota/available space
- Verify the folder structure is being created
- Check script permissions for Drive access

### Debugging
1. Open Apps Script editor
2. Click "Executions" tab
3. Click on recent executions to view detailed logs
4. Look for error messages in the execution log

## Data Schema Reference

### Parsed JSON Format
```json
{
  "wrong": ["item 1", "item 2"],
  "good": ["accomplishment 1", "accomplishment 2"], 
  "forgot": ["missed action 1", "missed action 2"],
  "raw": "full original text",
  "source": "rocketbook"
}
```

This structure supports:
- Simple queries in Google Sheets
- Future migration to databases
- AI/agent processing for insights
- Habit pattern analysis

## Next Steps

Once this MVP is working, you can:
1. Add more sophisticated parsing
2. Create visualizations from the data
3. Build an AI agent for insights
4. Set up automated habit analysis
5. Create habit trend reports

The foundation is now in place for scaling to a full knowledge base and AI-driven habit insight system!