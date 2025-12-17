# 📸 Guía de Depuración - Cámara QR

## Si la cámara no se enciende, verifica esto:

### 1. **¿Está en HTTPS?** (Crítico)
```
❌ http://localhost:4200 → NO FUNCIONA
✅ https://localhost:4200 → SÍ FUNCIONA
✅ En producción siempre HTTPS
```

**Solución para desarrollo local:**
```bash
ng serve --ssl --ssl-cert local.crt --ssl-key local.key
```

O edita `angular.json`:
```json
"serve": {
  "builder": "@angular-devkit/build-angular:dev-server",
  "options": {
    "ssl": true,
    "sslCert": "local.crt",
    "sslKey": "local.key"
  }
}
```

---

### 2. **Verifica permisos en el navegador**

**Chrome/Edge:**
1. Ingresa a `chrome://settings/content/camera`
2. Verifica que tu sitio no esté bloqueado
3. Si está bloqueado, elimínalo y recarga

**Firefox:**
1. Entra a `about:preferences#privacy`
2. Busca "Camera"
3. Permite el acceso

**Safari (macOS):**
1. System Preferences → Security & Privacy → Camera
2. Verifica que el navegador está autorizado

---

### 3. **Abre la consola del navegador (F12)**

Busca estos mensajes:

| Mensaje | Significado | Solución |
|---------|-------------|----------|
| `SecurityError` | No es HTTPS | Usa HTTPS |
| `NotAllowedError` | Usuario denegó permiso | Limpiar datos del sitio y reintentar |
| `NotFoundError` | Sin cámara disponible | Conecta una cámara USB |
| `NotReadableError` | Cámara en uso por otra app | Cierra otra app que use cámara |
| `TypeError: navigator.mediaDevices is undefined` | Navegador muy antiguo | Actualiza navegador |

---

### 4. **Prueba rápida en consola del navegador**

```javascript
// Ejecuta esto en la consola (F12):
navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
  .then(stream => {
    console.log('✅ ÉXITO - Cámara funciona');
    stream.getTracks().forEach(t => t.stop());
  })
  .catch(e => console.error('❌ ERROR:', e.name, e.message));
```

---

### 5. **Lista de dispositivos disponibles**

```javascript
// En la consola:
navigator.mediaDevices.enumerateDevices().then(devices => {
  devices.forEach(d => {
    if(d.kind === 'videoinput') 
      console.log('📷', d.label || 'Cámara anónima', d.deviceId);
  });
});
```

---

### 6. **Verifica la configuración de constraints**

El código ahora incluye:
```typescript
video: {
  facingMode: 'environment',
  width: { min: 320, ideal: 1280, max: 1920 },
  height: { min: 240, ideal: 720, max: 1080 }
}
```

Si falla, el navegador intenta ajustar automáticamente.

---

### 7. **Problemas comunes y soluciones**

| Problema | Causa | Solución |
|----------|-------|----------|
| Cámara negra/sin imagen | Permissions Policy | Verifica `index.html` meta tags |
| Error "Permission denied" | Permiso ya fue denegado | Limpia datos sitio Chrome: Settings → Privacy → Clear browsing data |
| Funciona en un navegador pero no en otro | Diferencias de implementación | Intenta otro navegador (Chrome recomendado) |
| Cámara lenta/lag | Resolución muy alta | Los constraints ahora incluyen limites |
| App se bloquea al iniciar | Stream no cerrado | Se agregó `.stop()` automático |

---

### 8. **Logs detallados activados**

Abre la consola (F12) y verás:
- ✅ `Inicializando cámara...`
- ✅ `Dispositivos encontrados: X`
- ✅ `Intentando configuración genérica...`
- ❌ `Error enumerando dispositivos`
- ❌ `Permiso de cámara denegado`

---

### 9. **Fuerza reinicio completo**

```bash
# Terminal:
Ctrl+Shift+Del  (Windows/Linux)
Cmd+Shift+Del   (macOS)
```

Esto limpia caché y cookies del sitio.

---

### 10. **Contacto de soporte**

Si persiste el error después de lo anterior:
1. **Abre la consola** (F12) → pestaña "Console"
2. **Copia el error completo** (Ctrl+A, Ctrl+C)
3. **Crea un Issue** con el error y tu navegador/SO

---

## Cambios realizados en el código:

✅ Agregado `requestCameraPermissionAndInit()` para solicitar permisos explícitamente  
✅ Mejorados constraints con dimensiones min/ideal/max  
✅ Diferenciación de errores (SecurityError, NotAllowedError, etc.)  
✅ Meta tags en index.html para permisos-policy  
✅ Optimización: intenta genérico primero (mucho más rápido)  
✅ Mejor manejo de streams (auto-close)

---

**Última actualización:** 16/12/2025  
**Versión:** ngx-scanner-qrcode 1.7.6 + Angular 20.3.0
