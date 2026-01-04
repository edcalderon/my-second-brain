# Código Actualizado: Mover Emails a Archives/rocketbook

## Cambios Necesarios

Actualizar la sección donde se marca el email como leído para también moverlo a la carpeta Archives/rocketbook.

### Ubicación en el código

**Archivo**: `packages/gcp-functions/index.js`
**Línea**: ~129

### Código Actual

```javascript
await client.messageFlagsAdd(uid, ['\\Seen']);
```

### Código Actualizado

```javascript
// Marcar como leído
await client.messageFlagsAdd(uid, ['\\Seen']);

// Mover email a Archives/rocketbook si está en Junk
if (mailbox.path === 'INBOX.Junk') {
    try {
        await client.messageMove(uid, 'INBOX.Archives.rocketbook');
        console.log(`✅ Moved email from Junk to Archives/rocketbook`);
    } catch (moveError) {
        console.warn(`⚠️ Failed to move email to Archives/rocketbook: ${moveError.message}`);
        // Continuar aunque falle el movimiento
    }
}
```

## Cambio Completo en Contexto

### Antes

```javascript
for (const uid of messages) {
    try {
        let { content } = await client.download(uid);
        let parsed = await simpleParser(content);

        const transcriptionAttachments = parsed.attachments.filter(att =>
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
                    await archiveToKnowledgeBase({ rawText, structuredData, filename: transcriptionAttachment.filename, subject, date, messageId: parsed.messageId });
                    
                    totalProcessed++;
                } catch (attachmentError) {
                    console.error(`❌ Failed to process attachment:`, attachmentError);
                    totalFailed++;
                    failedEmails.push({
                        messageId: parsed.messageId,
                        subject,
                        filename: transcriptionAttachment.filename,
                        error: attachmentError.message
                    });
                }
            }

            await client.messageFlagsAdd(uid, ['\\Seen']);
        } else {
            console.log(`⚠️ No transcription attachments found in: ${subject}`);
        }
    } catch (emailError) {
        console.error(`❌ Failed to process email UID ${uid}:`, emailError);
        totalFailed++;
        failedEmails.push({
            uid,
            error: emailError.message
        });
    }
}
```

### Después

```javascript
for (const uid of messages) {
    try {
        let { content } = await client.download(uid);
        let parsed = await simpleParser(content);

        const transcriptionAttachments = parsed.attachments.filter(att =>
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
                    await archiveToKnowledgeBase({ rawText, structuredData, filename: transcriptionAttachment.filename, subject, date, messageId: parsed.messageId });
                    
                    totalProcessed++;
                } catch (attachmentError) {
                    console.error(`❌ Failed to process attachment:`, attachmentError);
                    totalFailed++;
                    failedEmails.push({
                        messageId: parsed.messageId,
                        subject,
                        filename: transcriptionAttachment.filename,
                        error: attachmentError.message
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
                    console.warn(`⚠️ Failed to move email to Archives/rocketbook: ${moveError.message}`);
                    // Continuar aunque falle el movimiento
                }
            }
        } else {
            console.log(`⚠️ No transcription attachments found in: ${subject}`);
        }
    } catch (emailError) {
        console.error(`❌ Failed to process email UID ${uid}:`, emailError);
        totalFailed++;
        failedEmails.push({
            uid,
            error: emailError.message
        });
    }
}
```

## Logs Esperados Después

```
🚀 Starting Hostinger IMAP Fetch...
📬 Available mailboxes: INBOX, INBOX.Sent, INBOX.Drafts, INBOX.Junk, INBOX.Trash, INBOX.Archives, INBOX.Archives.rocketbook
🔍 Checking mailbox: INBOX
📩 Found 1 unread emails in INBOX
📄 Processing: RB 2026-01-04 01.16.54-transcription-beta.txt
🤖 AI is structuring the note...
✅ Archived entry rb_1767512820029499 to Firestore and Storage
✅ Moved email from Junk to Archives/rocketbook
🔍 Checking mailbox: INBOX.Junk
📩 Found 1 unread emails in INBOX.Junk
📄 Processing: RB 2026-01-04 01.16.54-transcription-beta.txt
🤖 AI is structuring the note...
✅ Archived entry rb_1767512820029500 to Firestore and Storage
✅ Moved email from Junk to Archives/rocketbook
```

## Pasos para Implementar

1. **Actualizar el código** en `packages/gcp-functions/index.js`
2. **Redeploy la función**:
   ```bash
   gcloud functions deploy rocketbook-fetch \
     --region=us-central1 \
     --project=second-brain-482901 \
     --quiet
   ```
3. **Probar** con un nuevo email
4. **Verificar** que se mueve correctamente

## Beneficios

✓ Emails organizados automáticamente
✓ Junk limpio después del procesamiento
✓ Auditoría de emails procesados
✓ Evita reprocesamiento (marcado como leído)

---

**Cambio**: Agregar movimiento de emails a Archives/rocketbook
**Líneas afectadas**: ~129-135
**Impacto**: Organización automática
