# 📚 Estructura Firebase actualizada

Este proyecto usa únicamente dos colecciones en Firestore:

- `registroAsistencia`: registros de entrada/salida y actividades.
- `estudiantes`: catálogo de estudiantes con atributos administrativos.

---

## Colección: `estudiantes`

Atributos por documento (ID del documento = cédula del estudiante):

| Campo | Tipo | Ejemplo |
|-------|------|---------|
| `actividad` | String | "Sistema de Registro" |
| `apellidos` | String | "Alvarez Elizalde" |
| `carrera` | String | "Ingeniería en Ciencias de la Computación" |
| `correo` | String | "bvalvarez1@utpl.edu.ec" |
| `estado` | String | "Activo" |
| `modalidad` | String | "Presencial" |
| `nombres` | String | "Byron Vicente" |
| `proyecto` | String | "Kiosko XRLab." |
| `tipo` | String | "Practicum" |
| `totalHoras` | Number | 0 |

> Nota: `totalHoras` puede usarse para acumular horas totales del estudiante si se desea.

---

## Colección: `registroAsistencia`

Cada documento representa una sesión de asistencia (entrada/salida) con campos:

| Campo | Tipo | Ejemplo |
|-------|------|---------|
| `idEstudiante` | String | "1105749939" |
| `cedula` | String | "1105749939" |
| `codigoQR` | String | "1105749939#17122025" |
| `horaEntrada` | Timestamp/Date | 2025-12-17 22:27:46 UTC-5 |
| `horaSalida` | Timestamp/Date | 2025-12-17 22:28:15 UTC-5 |
| `actividades` | Array<String> | ["Modelado 3D", "Pruebas de escaneo"] |
| `totalHoras` | String | "0h 7m 48s" |
| `estadoSesion` | String | "activa" | "cerrada" | "caducada" |
| `cerradaAutomaticamente` | Boolean | true/false |
| `motivoCierre` | String | "superó 24h sin salida" |

> Cambios: Se eliminan `marcaTiempo` y `marcaTiempoSalida` por redundantes. Se agrega `totalHoras` y `totalHorasFormato` (legible "Hh Mm Ss") calculados al registrar la salida.
> Se agregan campos de estado para controlar sesiones caducadas (>24h sin salida).

---

## Flujo de Datos

1️⃣ Check-In (entrada)

- Se crea un documento en `registroAsistencia` con: `idEstudiante`, `cedula`, `codigoQR`, `horaEntrada` y `totalHoras: 0`.

2️⃣ Check-Out (salida)

- Se actualiza el mismo documento con: `horaSalida`, `actividades` y `totalHoras` calculado.

3️⃣ Auto-cierre por caducidad (>24h)

- Si al escanear un nuevo QR existe una sesión activa cuya `horaEntrada` supera 24 horas sin `horaSalida`, se cierra automáticamente:
  - `estadoSesion = 'caducada'`
  - `cerradaAutomaticamente = true`
  - `motivoCierre = 'superó 24h sin salida'`
  - `totalHoras = 0`
  - No se solicita actividades.

> Cálculo de `totalHoras`: diferencia entre `horaEntrada` y `horaSalida` en horas; se guarda con dos decimales.

---

## Consultas útiles

### Última sesión activa de un estudiante

```ts
query(
  collection(db, 'registroAsistencia'),
  where('idEstudiante', '==', studentId),
  orderBy('horaEntrada', 'desc'),
  limit(1)
)
```

### Sesiones con salida registrada y sus horas

```ts
query(
  collection(db, 'registroAsistencia'),
  where('horaSalida', '!=', null),
  orderBy('horaEntrada', 'desc')
)
```

---

## Reglas de Firestore (sugeridas)

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /estudiantes/{id} {
      allow read: if request.auth != null; // ajusta según necesidad
      allow write: if request.auth != null; // solo apps autenticadas
    }

    match /registroAsistencia/{doc} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

---

## Índices

Para la consulta compuesta `where('idEstudiante'=='...') + orderBy('horaEntrada' desc)` es probable que Firestore solicite crear un índice compuesto. Sigue el enlace que provee el error para crear el índice.

---

## Estado del código

- `KioskService` guarda entrada y salida en `registroAsistencia`, calcula `totalHoras` al salir y elimina `marcaTiempo*`.
- `LoggingService` ya no escribe en `registros` para evitar redundancia.
