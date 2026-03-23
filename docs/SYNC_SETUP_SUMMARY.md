# Resumen de Configuración de Sync

## Estado Actual

### ✓ Completado
- [x] API de sync creada y funcionando
- [x] Cloud Function `rocketbook-fetch` desplegada
- [x] Secret Manager habilitado
- [x] Secret `imap-password` creado
- [x] Contraseña almacenada en Secret Manager
- [x] Permisos IAM configurados para la función

### 🔄 En Progreso
- [ ] Actualización de Cloud Function para usar Secret Manager
- [ ] Verificación de que la función accede al secret correctamente

### ⏳ Próximos Pasos
1. Esperar a que se complete el deployment
2. Probar la función
3. Verificar que los emails se sincronizan

## Comandos Ejecutados

```bash
# 1. Habilitar Secret Manager
gcloud services enable secretmanager.googleapis.com --project=second-brain-482901

# 2. Crear secret
gcloud secrets create imap-password \
  --replication-policy="automatic" \
  --project=second-brain-482901

# 3. Agregar contraseña
echo -n "[YOUR_IMAP_PASSWORD]" | gcloud secrets versions add imap-password \
  --data-file=- \
  --project=second-brain-482901

# 4. Dar permisos
gcloud secrets add-iam-policy-binding imap-password \
  --member=serviceAccount:admin-second-brain@second-brain-482901.iam.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor \
  --project=second-brain-482901

# 5. Actualizar función (en progreso)
gcloud functions deploy rocketbook-fetch \
  --region=us-central1 \
  --project=second-brain-482901 \
  --remove-env-vars IMAP_PASSWORD \
  --set-secrets IMAP_PASSWORD=imap-password:latest \
  --quiet
```

## Verificación

### Verificar que el secret está configurado
```bash
gcloud functions describe rocketbook-fetch \
  --region=us-central1 \
  --project=second-brain-482901 \
  --format=json | grep -A 5 "secretEnvironmentVariables"
```

Resultado esperado:
```json
"secretEnvironmentVariables": [
  {
    "key": "IMAP_PASSWORD",
    "version": "imap-password:latest"
  }
]
```

### Probar la función
```bash
curl -X POST https://us-central1-second-brain-482901.cloudfunctions.net/rocketbook-fetch \
  -H "Content-Type: application/json" \
  -d '{"force":true}'
```

Resultado esperado:
```json
{
  "success": true,
  "message": "Sync completed successfully",
  "processed": 1,
  "timestamp": "2026-01-04T..."
}
```

## Flujo de Sincronización

```
Usuario hace clic en "Sync"
    ↓
POST /my-second-brain/api/sync
    ↓
Llama a rocketbook-fetch Cloud Function
    ↓
Función obtiene IMAP_PASSWORD de Secret Manager
    ↓
Se conecta a imap.hostinger.com
    ↓
Autentica con secondbrain@lealsystem.net + contraseña
    ↓
Obtiene nuevos emails de Rocketbook
    ↓
Procesa y almacena en Firestore
    ↓
Retorna respuesta con cantidad procesada
    ↓
Dashboard se actualiza
```

## Seguridad

### Antes (Inseguro)
- Contraseña en variable de entorno
- Visible para cualquiera con acceso al proyecto
- Difícil de cambiar
- Sin auditoría

### Ahora (Seguro)
- Contraseña encriptada en Secret Manager
- Acceso controlado por IAM
- Fácil de cambiar (crear nueva versión)
- Auditoría de accesos
- Cumple con mejores prácticas

## Cambiar la Contraseña

Si necesitas cambiar la contraseña en el futuro:

```bash
# Crear nueva versión del secret
echo -n "nueva-contraseña" | gcloud secrets versions add imap-password \
  --data-file=- \
  --project=second-brain-482901

# La función usará automáticamente la versión más reciente
```

## Troubleshooting

### La función sigue sin funcionar
```bash
# Ver logs
gcloud functions logs read rocketbook-fetch \
  --region=us-central1 \
  --limit=50

# Redeploy
gcloud functions deploy rocketbook-fetch \
  --region=us-central1 \
  --project=second-brain-482901 \
  --quiet
```

### Error de permisos
```bash
# Verificar permisos
gcloud secrets get-iam-policy imap-password \
  --project=second-brain-482901

# Agregar permisos si es necesario
gcloud secrets add-iam-policy-binding imap-password \
  --member=serviceAccount:admin-second-brain@second-brain-482901.iam.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor \
  --project=second-brain-482901
```

---

**Última actualización**: 2026-01-04
**Estado**: Configuración de Secret Manager en progreso
**Próximo paso**: Esperar deployment y probar
