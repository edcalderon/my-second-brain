# Configuración Segura de Contraseña con Secret Manager

## Problema de Seguridad

Google Cloud ha detectado que la contraseña IMAP está almacenada en una variable de entorno, lo cual es inseguro porque:
- Es visible para cualquiera con rol de Visualizador de proyectos
- Es difícil de cambiar
- No está encriptada adecuadamente

## Solución: Usar Secret Manager

### Paso 1: Crear el Secret

```bash
gcloud secrets create imap-password \
  --replication-policy="automatic" \
  --project=second-brain-482901
```

### Paso 2: Agregar la Contraseña

```bash
echo -n "787VHez3Q1*" | gcloud secrets versions add imap-password \
  --data-file=- \
  --project=second-brain-482901
```

### Paso 3: Dar Permisos a la Cloud Function

```bash
# Obtener el email de la cuenta de servicio
SERVICE_ACCOUNT=$(gcloud functions describe rocketbook-fetch \
  --region=us-central1 \
  --project=second-brain-482901 \
  --format='value(serviceConfig.serviceAccountEmail)')

# Dar permiso para acceder al secret
gcloud secrets add-iam-policy-binding imap-password \
  --member=serviceAccount:$SERVICE_ACCOUNT \
  --role=roles/secretmanager.secretAccessor \
  --project=second-brain-482901
```

### Paso 4: Actualizar la Cloud Function

```bash
gcloud functions deploy rocketbook-fetch \
  --region=us-central1 \
  --project=second-brain-482901 \
  --remove-env-vars IMAP_PASSWORD \
  --set-secrets IMAP_PASSWORD=imap-password:latest \
  --quiet
```

## Verificación

```bash
# Verificar que el secret está configurado
gcloud functions describe rocketbook-fetch \
  --region=us-central1 \
  --project=second-brain-482901 \
  --format=json | grep -A 5 "secretEnvironmentVariables"

# Probar la función
curl -X POST https://us-central1-second-brain-482901.cloudfunctions.net/rocketbook-fetch \
  -H "Content-Type: application/json" \
  -d '{"force":true}'
```

## Beneficios

✓ Contraseña encriptada en Secret Manager
✓ Acceso controlado por IAM
✓ Auditoría de accesos
✓ Fácil rotación de contraseñas
✓ Cumple con mejores prácticas de seguridad

## Cambiar la Contraseña en el Futuro

```bash
# Crear nueva versión del secret
echo -n "nueva-contraseña" | gcloud secrets versions add imap-password \
  --data-file=- \
  --project=second-brain-482901

# La Cloud Function usará automáticamente la versión más reciente
```

## Troubleshooting

### Error: "Permission denied"
```bash
# Asegúrate de que la cuenta de servicio tiene permisos
gcloud secrets add-iam-policy-binding imap-password \
  --member=serviceAccount:admin-second-brain@second-brain-482901.iam.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor \
  --project=second-brain-482901
```

### La función sigue sin funcionar
```bash
# Verifica los logs
gcloud functions logs read rocketbook-fetch \
  --region=us-central1 \
  --limit=20

# Redeploy la función
gcloud functions deploy rocketbook-fetch \
  --region=us-central1 \
  --project=second-brain-482901 \
  --quiet
```

---

**Estado**: Configuración de Secret Manager en progreso
**Seguridad**: Mejorada con encriptación
**Próximo paso**: Ejecutar los comandos anteriores
