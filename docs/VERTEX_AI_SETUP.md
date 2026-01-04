# Configuración de Vertex AI para Procesamiento de Emails

## Problema

La función `rocketbook-fetch` está intentando usar Vertex AI (Gemini) para estructurar los emails, pero el modelo no está disponible:

```
Error: Publisher Model `projects/second-brain-482901/locations/us-central1/publishers/google/models/gemini-1.5-flash` was not found
```

## Solución

### Opción 1: Habilitar Vertex AI (Recomendado)

```bash
# 1. Habilitar la API de Vertex AI
gcloud services enable aiplatform.googleapis.com --project=second-brain-482901

# 2. Habilitar acceso al modelo Gemini
gcloud services enable generativelanguage.googleapis.com --project=second-brain-482901

# 3. Verificar que el modelo está disponible
gcloud ai models list --project=second-brain-482901 --region=us-central1
```

### Opción 2: Usar Fallback (Sin AI)

Si no quieres usar Vertex AI, la función ya tiene un fallback que almacena los emails sin procesamiento de IA:

```
AI Structuring failed, falling back to raw: [email stored without AI processing]
```

## Estado Actual

✓ **Función funcionando**: La función está procesando emails correctamente
✓ **IMAP conectando**: Encontrando emails en INBOX y INBOX.Junk
✓ **Almacenamiento**: Guardando emails en Firestore
⚠️ **AI Structuring**: Fallando (pero con fallback a almacenamiento sin IA)

## Logs Recientes

```
📬 Available mailboxes: INBOX, INBOX.Sent, INBOX.Drafts, INBOX.Junk, INBOX.Trash, INBOX.Archives
📩 Found 2 unread emails in INBOX.Junk
📩 Found 1 unread emails in INBOX
📄 Processing: RB 2025-12-31 22.48.12-transcription-beta.txt
🤖 AI is structuring the note...
⚠️ AI Structuring failed, falling back to raw
✅ Archived entry to Firestore and Storage
```

## Próximos Pasos

1. **Habilitar Vertex AI** (si quieres procesamiento de IA):
   ```bash
   gcloud services enable aiplatform.googleapis.com --project=second-brain-482901
   ```

2. **O continuar sin AI** (los emails se almacenan sin procesamiento):
   - Los emails se guardan en Firestore
   - Se pueden procesar manualmente después
   - El fallback está funcionando correctamente

3. **Verificar que los emails se están sincronizando**:
   ```bash
   # Revisar Firestore para nuevas entradas
   # O usar el dashboard para ver los emails
   ```

## Información de Vertex AI

- **Modelo**: Gemini 1.5 Flash
- **Ubicación**: us-central1
- **Costo**: Bajo (modelo flash es económico)
- **Uso**: Estructurar y resumir contenido de emails

## Alternativas

Si no quieres usar Vertex AI:

1. **Usar otro modelo de IA** (OpenAI, Anthropic, etc.)
2. **Procesar manualmente** después de sincronizar
3. **Usar reglas simples** en lugar de IA

## Verificación

Después de habilitar Vertex AI:

```bash
# Probar la función
curl -X POST https://us-central1-second-brain-482901.cloudfunctions.net/rocketbook-fetch \
  -H "Content-Type: application/json" \
  -d '{"force":true}'

# Ver logs
gcloud functions logs read rocketbook-fetch \
  --region=us-central1 \
  --limit=20
```

---

**Estado**: Función funcionando con fallback
**Próximo paso**: Habilitar Vertex AI (opcional)
**Emails sincronizados**: Sí, sin procesamiento de IA
