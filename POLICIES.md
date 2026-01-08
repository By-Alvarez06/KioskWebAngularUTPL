# 📋 Políticas de Control y Seguridad - Sistema Kiosko XRLab

Este documento define todas las políticas de validación, control y seguridad implementadas en el sistema de registro de asistencia QR.

---

## 1️⃣ Políticas de Sesión (Duración y Estado)

### 1.1 Cierre Automático por Caducidad (>24h)

**Objetivo**: Evitar que una sesión sin salida registre horas indefinidas.

**Regla**: Si un estudiante escanea su QR nuevamente y existe una sesión activa (sin `horaSalida`) cuya `horaEntrada` supera **24 horas**, se cierra automáticamente:

- `estadoSesion = 'caducada'`
- `cerradaAutomaticamente = true`
- `motivoCierre = 'superó 24h sin salida'`
- `totalHoras = 0` (no se cuentan las horas)
- **No se solicita** ingresar actividades

**Ejemplo**:
- **Lunes 08:00**: Estudiante escanea entrada → crea sesión activa
- **Martes 09:00**: Estudiante escanea entrada (olvida salida ayer)
- **Resultado**: Sesión del lunes se cierra automáticamente como `caducada`, `totalHoras=0`; nueva sesión del martes se crea como normal

**Impacto**: Previene fraudes de horas no realizadas; mantiene integridad del registro.

---

### 1.2 Estados de Sesión

Cada documento en `registroAsistencia` tiene un `estadoSesion`:

| Estado | Significado | `totalHoras` |
|--------|------------|------------|
| `activa` | Sesión en curso (sin `horaSalida`) | 0 (inicial) |
| `cerrada` | Cierre normal por `submitActivities()` | Calculado |
| `caducada` | Auto-cierre por >24h sin salida | 0 (no contabiliza) |

---

## 2️⃣ Políticas de QR y Validación

### 2.1 Expiración de QR (Fecha Diaria)

**Objetivo**: Solo aceptar QR válidos del día actual; rechazar QR antiguos o futuros.

**Regla**: El formato QR `CEDULA10#DDMMYYYY` se valida contra la fecha actual. Si la fecha en el QR no coincide con **hoy**, se rechaza:

- Mensaje: `"QR expirado. Fecha QR: DD/MM/YYYY, Hoy: DD/MM/YYYY"`
- **No se crea** sesión
- **No se afecta** sesión activa previa
- Usuario debe usar QR del día

**Ejemplo**:
- Hoy es **17/12/2025**
- QR tiene fecha **16/12/2025** (ayer)
- **Resultado**: Rechazado, mensaje de error

**Parámetro**:
```typescript
const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
if (parsed.dateISO !== today) {
  // Rechazar
}
```

**Impacto**: Previene uso de QR viejos; garantiza que cada entrada es del día actual.

---

### 2.2 Validez de Formato QR

El sistema reconoce dos formatos:

1. **Formato Personalizado** (esperado para educación): `CEDULA10#DDMMYYYY`
   - Ejemplo: `1105749939#17122025`
   - Se parsea fecha y cédula
   - Fecha validada contra hoy (Política 2.1)

2. **Formato JSON** (alternativo): Campo `cedula`, `id`, `studentId`
   - Ejemplo: `{"cedula":"1105749939","nombre":"Byron Vicente"}`
   - Se procesa como estudiante ID

---

## 3️⃣ Políticas de Actividades

### 3.1 Actividades Obligatorias al Cierre

**Objetivo**: Asegurar que cada sesión documenta qué se hizo; elimina sesiones vacías.

**Regla**: Al presionar "Registrar Salida", **al menos una actividad debe estar completa** (no vacía ni solo espacios):

- Validación: filtrar `activities.filter(a => a && a.trim().length > 0)`
- Si no hay actividades válidas:
  - Mensaje: `"Error: Debes ingresar al menos una actividad realizada."`
  - **No se cierra** sesión
  - Formulario permanece abierto
  - Usuario debe volver a intentar

**Ejemplo**:
- Campos de actividades: `["", "", "", "", ""]` (todos vacíos)
- **Resultado**: Error, rechazo

- Campos: `["Modelado 3D", "", "", "", ""]` (una actividad)
- **Resultado**: Acepta, cierra sesión, registra `actividades: ["Modelado 3D"]`

**Campos en Base de Datos**:
- `registroAsistencia.actividades` = Array de strings sin espacios vacíos
- Solo actividades válidas se guardan

**Impacto**: Fuerza documentación de trabajo; auditoría de qué se hizo.

---

## 4️⃣ Políticas de Cálculo de Horas

### 4.1 Total Horas por Sesión

**Objetivo**: Registrar duración exacta de cada sesión de trabajo.

**Regla**: Al cerrar (`horaSalida` - `horaEntrada`) se calcula un campo legible:

**`totalHoras` (legible)**: "Hh Mm Ss"
```typescript
function formatearDuracion(duracionMs: number) {
  const segundos = Math.floor(duracionMs / 1000);
  const minutos = Math.floor(segundos / 60);
  const horas = Math.floor(minutos / 60);
  const segsRestantes = segundos % 60;
  const minsRestantes = minutos % 60;
  return `${horas}h ${minsRestantes}m ${segsRestantes}s`;
}
```

**Ejemplos**:
| Entrada | Salida | Duración | `totalHoras` |
|---------|--------|----------|--------------|
| 08:00 | 10:00 | 2 horas | 2h 0m 0s |
| 14:30 | 15:15 | 45 minutos | 0h 45m 0s |
| 09:00 | 10:38 | 1h 38m | 1h 38m 0s |

**Casos Especiales**:
- Si `horaSalida < horaEntrada` (anomalía): se fuerza `totalHoras = 0` y `motivoCierre = 'hora de salida anterior a entrada'`
- Si `totalHoras` es negativa: se convierte a `0`

**Acumulado**: `totalHoras` se registra **solo para sesiones `cerrada`** (no `caducada`). En la base de datos se guarda solo la versión legible (Hh Mm Ss); el cálculo en horas decimales se hace solo en código, no se persiste.

### 4.2 Duración mínima de sesión (5 minutos)

**Objetivo**: Evitar registros de sesiones triviales por error de escaneo.

**Regla**: Si la duración real entre `horaEntrada` y `horaSalida` es menor a 5 minutos:
- Se guarda `totalHoras = "0h 0m 0s"`
- Se establece `motivoCierre = "duracion menor al mínimo (5m)"`
- La sesión se mantiene con `estadoSesion = 'cerrada'` para auditoría, pero sin horas contables

**Ejemplo**:
- Entrada: 10:00, Salida: 10:03 (3 minutos) → `totalHoras = 0h 0m 0s`, `motivoCierre` seteado
- Entrada: 10:00, Salida: 10:08 (8 minutos) → `totalHoras = 0h 8m 0s`, `motivoCierre` nulo

---

## 5️⃣ Políticas de Datos y Integridad

### 5.2 Campos Requeridos en `estudiantes`

Cada documento debe tener (ID = cédula):

```json
{
  "nombres": "Byron Vicente",
  "apellidos": "Alvarez Elizalde",
  "cedula": "1105749939",
  "carrera": "Ingeniería en Ciencias de la Computación",
  "correo": "bvalvarez1@utpl.edu.ec",
  "estado": "Activo",
  "modalidad": "Presencial",
  "proyecto": "Kiosko XRLab.",
  "tipo": "Practicum",
  "actividad": "Sistema de Registro",
  "totalHoras": 0  // acumulado (actualizarlo manualmente o vía Cloud Function)
}
```

---

### 5.3 Campos en `registroAsistencia` (Sesión)

Cada documento registra una sesión completa:

```json
{
  "idEstudiante": "1105749939",
  "cedula": "1105749939",
  "codigoQR": "1105749939#17122025",
  "horaEntrada": Timestamp,
  "horaSalida": Timestamp,  // null si aún activa
  "actividades": ["Modelado 3D", "Pruebas"],
  "totalHoras": "1h 38m 0s",
  "estadoSesion": "cerrada",  // activa | cerrada | caducada
  "cerradaAutomaticamente": false,
  "motivoCierre": null
}
```

Campos no usados en el modelo actual:
- `marcaTiempo` (uso servidor, inútil)
- `marcaTiempoSalida` (idem)

---

## 6️⃣ Políticas de Trazabilidad y Auditoría

### 6.1 Estado de Sesión para Auditoría

Cada sesión registra cómo fue cerrada:

| Campo | Propósito |
|-------|-----------|
| `estadoSesion` | Tipo de cierre: normal/automático/manual |
| `cerradaAutomaticamente` | `true` si se auto-cerró por caducidad |
| `motivoCierre` | Razón de cierre (ej. "superó 24h sin salida") |

**Consulta auditora**: encontrar sesiones caducadas
```ts
query(collection(db, 'registroAsistencia'),
  where('estadoSesion', '==', 'caducada'),
  orderBy('horaEntrada', 'desc')
)
```

---

### 6.2 Logs del Sistema

El servicio registra en consola (`console.log`, `console.warn`, `console.error`):

- ✅ Entrada guardada: `"✅ Entrada registrada en Firebase: <docId>"`
- ⚠️ QR expirado: `"Rechazado: QR expirado. Fecha QR: ..., Hoy: ..."`
- ⚠️ Sesión caducada auto-cerrada: `"⚠️ Sesión caducada auto-cerrada: <docId>"`
- ❌ Actividades vacías: `"Error: Debes ingresar al menos una actividad realizada."`

**Destinatario**: revisar navegador Dev Tools → Console para trazar operaciones.

---

## 7️⃣ Flujo Completo de Validaciones

```
┌─────────────────────────────────────────────────────────────────┐
│                       Escanea QR                                 │
└────────────────────┬────────────────────────────────────────────┘
                     │
            ┌────────▼────────┐
            │ VALIDAR QR      │
            │ Formato OK?     │
            └────────┬────────┘
                     │ NO → Rechazar con error
                     │
            ┌────────▼────────┐
            │ VALIDAR FECHA   │
            │ Fecha = Hoy?    │
            └────────┬────────┘
                     │ NO → Rechazar "QR expirado"
                     │
            ┌────────▼────────┐
            │ BUSCAR ESTUDIANTE
            │ en collection   │
            └────────┬────────┘
                     │
            ┌────────▼────────────────┐
            │ ¿Sesión activa          │
            │ (sin horaSalida)?       │
            └────────┬────────────────┘
                     │
          NO ────────┼──────── SÍ
          │          │            │
      NUEVA      ┌───▼────────┐   │
      SESIÓN     │ >24h?      │   │
                 └───┬────────┘   │
                     │            │
                NO ──┼── SÍ       │
                │    │     │      │
             PEDIR  AUTO  NORMAL  │
             ACTIV. CERRAR SALIDA │
             INPUT  "CADUCADA"    │
                     │            │
                    ┌▼────────────▼┐
                    │ Rellenar     │
                    │ actividades  │
                    └──┬───────────┘
                       │
              ┌────────▼────────┐
              │ ¿Actividades    │
              │ válidas?        │
              └────────┬────────┘
                       │ NO → Error "ingresa al menos una"
                       │
              ┌────────▼────────┐
              │ GUARDAR SALIDA  │
              │ + totalHoras    │
              │ + actividades   │
              └────────┬────────┘
                       │
              ┌────────▼────────┐
              │   CERRADO       │
              │ estadoSesion=   │
              │ 'cerrada'       │
              └─────────────────┘
```

---

## 8️⃣ Reglas de Firestore (Seguridad)

Se recomienda agregar a `firestore.rules`:

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Colección: estudiantes
    match /estudiantes/{cedula} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
                      request.resource.data.size() > 0;
    }

    // Colección: registroAsistencia
    match /registroAsistencia/{doc} {
      allow read: if request.auth != null;
      allow create: if request.auth != null &&
                       request.resource.data.idEstudiante != null;
      allow update: if request.auth != null &&
                       request.resource.data.estadoSesion != null;
    }
  }
}
```

---

## 9️⃣ Políticas Futuras (Recomendadas)

1. **Tope de horas diarias**: Bloquear nuevo check-in si ya alcanzó 8h/día.
2. **Horario de laboratorio**: Solo permitir entrada/salida 08:00–20:00.
3. **Cooldown de escaneo**: Ignorar re-escaneos del mismo estudiante por 3 minutos.
4. **Acumulado automático**: Cloud Function diaria que suma `totalHoras` a `estudiantes.totalHoras`.
5. **Notificación**: Alerta si sesión alcanza 4h (pausa recomendada).
6. **Reporte diario**: CSV con asistencia y horas por estudiante.

---

## 🔟 Chequeo de Implementación

- ✅ Cierre automático por >24h → `loginWithQr()` en `kiosk.service.ts`
- ✅ Validación QR expirado → `loginWithQr()`, comparación `dateISO` vs `today`
- ✅ Actividades obligatorias → `submitActivities()`, filtro y rechazo
- ✅ Cálculo de `totalHoras` → `closeCheckOut()`, fórmula en ms a horas
- ✅ Estados de sesión → campos `estadoSesion`, `cerradaAutomaticamente`, `motivoCierre`
- ✅ Documentación → este archivo + `FIREBASE_STRUCTURE.md`

---

## 📞 Soporte y Auditoría

**Para revisar sesiones caducadas**:
Acceder Firebase Console → `registroAsistencia` → Filter: `estadoSesion == 'caducada'`

**Para revisar logs en tiempo real**:
Abrir Kiosko en navegador → F12 (Dev Tools) → Console → ver `console.log/warn/error`

**Para debugging**:
- Simular QR expirado: cambiar `dateISO` manualmente en JSON
- Simular sesión caducada: crear `horaEntrada` con timestamp de hace >24h

---

## 🔄 Migración y Verificación de Datos

### Propósito
Estos scripts permiten mantener la integridad de datos en Firestore, particularmente cuando hay cambios de formato o necesidad de sincronización.

### Scripts Disponibles

#### 1. `verify-accumulation.ts`
**Propósito**: Verificar que la acumulación de horas es correcta.

**Uso**:
```bash
npx ts-node verify-accumulation.ts
```

**Qué hace**:
1. Lee todos los estudiantes en la colección `estudiantes`
2. Para cada estudiante, suma todas sus sesiones cerradas válidas (≥5 minutos)
3. Compara el `totalHoras` registrado vs el total esperado
4. Reporta discrepancias con icono ✅ (correcto) o ❌ (discrepancia)

**Ejemplo de salida**:
```
✅ Estudiante: 1150579686
   Nombre: Erick Santiago Toledo Toledo
   Sesiones cerradas (válidas): 4
   Total registrado: 2h 47m 10s
   Total esperado (suma sesiones): 2h 47m 10s
```

#### 2. `migrate-data.ts`
**Propósito**: Migrar datos heredados a formato HMS y sincronizar acumulados.

**Uso**:
```bash
npx ts-node migrate-data.ts
```

**Qué hace**:
1. **PASO 1**: Convierte registros con formato decimal a HMS
   - `2.34` → `2h 20m 24s`
   - `0.01` → `0h 0m 36s`

2. **PASO 2**: Acumula todas las sesiones cerradas válidas en `estudiantes.totalHoras`

**Ejemplo de salida**:
```
📝 PASO 1: Convertiendo formatos decimales a HMS...
  Registro 2n0vmkSuweopnF9uDrLb: 2.34 → 2h 20m 24s
  Registro NwiJCR82wQeh1tkNUgOQ: 0.01 → 0h 0m 36s

✅ 2 registros convertidos a HMS

📊 PASO 2: Acumulando horas en estudiantes...
  Estudiante 1150579686 (Erick Santiago Toledo Toledo)
    Sesiones válidas: 4
    Total acumulado: 2h 47m 10s

✅ 1 estudiantes actualizados con totales acumulados
```

### Flujo de Uso Recomendado

1. **Cuando sospechas inconsistencias** → Ejecuta `verify-accumulation.ts`
2. **Si hay discrepancias** → Ejecuta `migrate-data.ts` para sincronizar
3. **Después de migración** → Ejecuta `verify-accumulation.ts` nuevamente para confirmar

### Notas Técnicas

- Los scripts acceden directamente a Firestore usando la configuración en `src/app/environments/environment.firebase.ts`
- Las sesiones menores a 5 minutos no se cuentan en la acumulación
- El formato HMS es: `"${horas}h ${minutos}m ${segundos}s"` (ej: `2h 47m 10s`)
- Los scripts usan `writeBatch` para operaciones eficientes

---

*Documento versión 1.0 — Enero 2026*
