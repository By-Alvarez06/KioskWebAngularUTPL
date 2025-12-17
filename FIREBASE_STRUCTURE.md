# 📊 Estructura Firebase - Check-In/Check-Out

## Colección: `checkIn`

Cada documento en esta colección representa un registro de entrada/salida de un estudiante.

### Estructura del Documento:

```json
{
  "id": "auto-generado",
  "studentId": "1234567890",
  "cedula": "1234567890",
  "checkInTime": "2024-12-16T14:30:00Z",
  "checkOutTime": "2024-12-16T14:45:00Z",
  "qrCode": "1234567890#16122024",
  "timestamp": "2024-12-16T14:30:00.000Z",
  "checkOutTimestamp": "2024-12-16T14:45:00.000Z"
}
```

### Campos:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `studentId` | String | ID del estudiante (generalmente la cédula) |
| `cedula` | String | Cédula del estudiante |
| `checkInTime` | Timestamp | Fecha y hora de entrada |
| `checkOutTime` | Timestamp | Fecha y hora de salida (se agrega después) |
| `qrCode` | String | Código QR escaneado |
| `timestamp` | Timestamp | Timestamp de FireServer al crear |
| `checkOutTimestamp` | Timestamp | Timestamp de FireServer al actualizar salida |

---

## Flujo de Datos:

### 1️⃣ Escanea QR (Check-In)

```
Usuario escanea QR
        ↓
loginWithQr() se llama
        ↓
Se crea nuevo documento en checkIn
        ↓
Documento guardado con:
  - studentId
  - checkInTime (ahora)
  - qrCode
  - timestamp (servidor)
        ↓
ID del documento guardado en previousCheckInId
```

### 2️⃣ Escanea Otro QR (Check-Out + Check-In)

```
Usuario escanea otro QR
        ↓
loginWithQr() se llama de nuevo
        ↓
Verifica if (previousCheckInId)
        ↓
SI: Llama closeCheckOut()
        ↓
Actualiza documento anterior:
  - checkOutTime (ahora)
  - checkOutTimestamp (servidor)
        ↓
Crea NUEVO documento para este QR
        ↓
Nuevo ID guardado en previousCheckInId
```

---

## Consultas útiles en Firebase Console:

### 📋 Ver todos los check-ins de hoy:

```javascript
db.collection('checkIn')
  .where('timestamp', '>=', new Date().setHours(0,0,0,0))
  .orderBy('timestamp', 'desc')
  .get()
```

### 👤 Ver registros de un estudiante específico:

```javascript
db.collection('checkIn')
  .where('studentId', '==', '1234567890')
  .orderBy('checkInTime', 'desc')
  .limit(10)
  .get()
```

### ⏱️ Ver estudiantes actualmente dentro (sin check-out):

```javascript
db.collection('checkIn')
  .where('checkOutTime', '==', null)
  .orderBy('checkInTime', 'desc')
  .get()
```

### 📊 Tiempo promedio de permanencia:

```javascript
db.collection('checkIn')
  .where('checkOutTime', '!=', null)
  .get()
  .then(snapshot => {
    let totalTime = 0;
    snapshot.forEach(doc => {
      const data = doc.data();
      const duration = data.checkOutTime - data.checkInTime;
      totalTime += duration;
    });
    console.log('Promedio:', totalTime / snapshot.size);
  })
```

---

## Seguridad - Reglas de Firestore:

Recomendado agregar a `firestore.rules`:

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Solo lectura para administradores
    match /checkIn/{document=**} {
      allow read: if request.auth.token.admin == true;
      allow create, update: if request.auth != null;
    }
  }
}
```

---

## Cambios Realizados en el Código:

✅ `KioskService` ahora conecta con Firebase  
✅ `loginWithQr()` es async y guarda en BD  
✅ `previousCheckInId` almacena el ID actual  
✅ Al nuevo QR: cierra sesión anterior (check-out) + abre nueva  
✅ `logout()` llama automáticamente `closeCheckOut()`  
✅ Timestamps guardados en servidor (más precisos)  
✅ Componente muestra `checkInTime` en formato HH:mm:ss  

---

## Dashboard recomendado (próxima mejora):

Crear página de administración para ver:
- ✅ Estadísticas diarias
- ✅ Estudiantes dentro/fuera
- ✅ Reporte de entrada/salida
- ✅ Descargar CSV
