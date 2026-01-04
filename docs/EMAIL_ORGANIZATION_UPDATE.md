# Actualización: Organizar Emails en Archives/rocketbook

## Objetivo

Después de capturar un nuevo email de Rocketbook desde la carpeta Junk, moverlo automáticamente a `Archives/rocketbook` en el servidor de emails.

## Flujo Actual vs Nuevo

### Flujo Actual
```
1. Conectar a IMAP
2. Buscar emails en INBOX y INBOX.Junk
3. Procesar email
4. Guardar en Firestore
5. ❌ Email permanece en Junk
```

### Flujo Nuevo
```
1. Conectar a IMAP
2. Buscar emails en INBOX y INBOX.Junk
3. Procesar email
4. Guardar en Firestore
5. ✅ Mover email a INBOX.Archives.rocketbook
6. Marcar como leído
```

## Cambios Necesarios

### En la Cloud Function (rocketbook-fetch)

La función necesita:

1. **Después de procesar**: Mover el email
2. **Usar IMAP MOVE**: Comando para mover emails
3. **Marcar como leído**: Para no reprocesar

### Pseudocódigo

```javascript
// Después de procesar el email
if (email.mailbox === 'INBOX.Junk') {
  // Mover a Archives/rocketbook
  await imap.messageMove(uid, 'INBOX.Archives.rocketbook');
  
  // Marcar como leído
  await imap.messageFlagsAdd(uid, ['\\Seen']);
}
```

## Implementación

### Paso 1: Actualizar la función

La función `rocketbook-fetch` en GCP necesita ser actualizada con:

```javascript
// Después de guardar en Firestore
if (sourceMailbox === 'INBOX.Junk') {
  try {
    // Mover email a Archives/rocketbook
    await imap.messageMove(messageUid, 'INBOX.Archives.rocketbook');
    console.log(`✅ Moved email to Archives/rocketbook`);
    
    // Marcar como leído
    await imap.messageFlagsAdd(messageUid, ['\\Seen']);
    console.log(`✅ Marked as read`);
  } catch (error) {
    console.error(`⚠️ Failed to move email: ${error.message}`);
    // Continuar aunque falle el movimiento
  }
}
```

### Paso 2: Crear la carpeta si no existe

```javascript
// Al conectar, crear la carpeta si no existe
try {
  await imap.mailboxCreate('INBOX.Archives.rocketbook');
  console.log('✅ Created Archives/rocketbook folder');
} catch (error) {
  if (error.message.includes('already exists')) {
    console.log('✅ Archives/rocketbook folder already exists');
  } else {
    console.error(`⚠️ Failed to create folder: ${error.message}`);
  }
}
```

## Beneficios

✓ **Organización automática**: Emails se organizan sin intervención manual
✓ **Evita duplicados**: Emails marcados como leídos no se reprocesarán
✓ **Limpia Junk**: La carpeta Junk se mantiene limpia
✓ **Auditoría**: Todos los emails procesados en una carpeta

## Carpetas Resultantes

```
INBOX
├── Rocketbook Scan - 2026-01-04 01.16.54 (nuevo)
├── Rocketbook Scan - 2026-01-03 22.15.30 (nuevo)
└── ...

INBOX.Junk
└── (vacío - emails movidos)

INBOX.Archives.rocketbook
├── Rocketbook Scan - 2025-12-31 22.48.47 ✓
├── Rocketbook Scan - 2025-12-30 22.33.13 ✓
└── ...
```

## Configuración en Hostinger

Verificar que la carpeta existe:

```bash
# Conectar a IMAP y listar carpetas
# La carpeta debe ser: INBOX.Archives.rocketbook
```

## Logs Esperados

Después de la actualización:

```
🚀 Starting Hostinger IMAP Fetch...
📬 Available mailboxes: INBOX, INBOX.Sent, INBOX.Drafts, INBOX.Junk, INBOX.Trash, INBOX.Archives, INBOX.Archives.rocketbook
📩 Found 1 unread emails in INBOX.Junk
📄 Processing: RB 2026-01-04 01.16.54-transcription-beta.txt
🤖 AI is structuring the note...
✅ Saved to Firestore
✅ Moved email to Archives/rocketbook
✅ Marked as read
✅ Archived entry to Firestore and Storage
```

## Próximos Pasos

1. **Actualizar la función** con la lógica de movimiento
2. **Redeploy** la función
3. **Probar** con un nuevo email
4. **Verificar** que se mueve correctamente

## Comando para Redeploy

```bash
gcloud functions deploy rocketbook-fetch \
  --region=us-central1 \
  --project=second-brain-482901 \
  --quiet
```

## Alternativas

Si no quieres mover los emails:

1. **Solo marcar como leído**: Evita reprocesamiento
2. **Crear etiqueta**: En lugar de mover
3. **Dejar en Junk**: Sin cambios

---

**Estado**: Listo para implementar
**Impacto**: Organización automática de emails
**Tiempo de implementación**: 15-30 minutos
