# Kiosco de Asistencia UTPL

Este proyecto es una aplicación de kiosco web desarrollada con Angular, diseñada para funcionar como un punto de registro de asistencia para estudiantes mediante el escaneo de códigos QR.

La aplicación está pensada para ejecutarse en un navegador en modo de pantalla completa (modo kiosco), utilizando la cámara del dispositivo para identificar al usuario y registrar su asistencia.

## Características Principales

- **Login por Código QR**: Utiliza la cámara del dispositivo para escanear un código QR y autenticar al usuario.
- **Interfaz de Kiosco**: La aplicación solicita automáticamente el modo de pantalla completa para una experiencia de usuario inmersiva y controlada.
- **Gestión de Asistencia**: Lógica preparada para validar la información del QR y registrar la asistencia (actualmente simulado, requiere un backend para producción).
- **Diseño Responsivo**: Adaptable a diferentes tamaños de pantalla, ideal para tablets o terminales de kiosco.

## Tecnologías Utilizadas

- **[Angular](https://angular.dev/)**: Framework principal para el desarrollo de la aplicación.
- **[TypeScript](https://www.typescriptlang.org/)**: Lenguaje de programación principal.
- **[ngx-scanner-qrcode](https://www.npmjs.com/package/ngx-scanner-qrcode?activeTab=readme)**: Librería nativa de Angular para acceder a la cámara y decodificar los códigos QR.
- **HTML5 y CSS**: Para la estructura y el estilo de la aplicación.

---

## Estructura del Proyecto

A continuación se describen los archivos y directorios más importantes para el funcionamiento del kiosco.

```
/src
├── /app
│   ├── /kiosk
│   │   ├── **qr-login.component.ts**: Componente CRÍTICO. Contiene toda la lógica para activar la cámara, escanear el código QR y emitir el resultado. Utiliza la librería `ngx-scanner-qrcode`.
│   │   ├── **kiosk.component.ts**: Componente principal de la interfaz del kiosco. Se muestra después de un login exitoso.
│   │   ├── **kiosk.service.ts**: Servicio de Angular para manejar la lógica de negocio, como la validación del QR o la comunicación con un futuro backend.
│   │   └── **kiosk.guard.ts**: Un "guardián" de rutas que podría usarse para proteger las páginas del kiosco, asegurando que solo se pueda acceder después de un login válido.
│   │
│   ├── **app.routes.ts**: Archivo de configuración de rutas. Define qué componente se carga para cada URL (por ejemplo, `/login`, `/kiosk`).
│   └── **app.component.ts**: El componente raíz de la aplicación.
│
├── /public
│   └── /img
│       ├── **utpl.png**: Logo de la universidad.
│       └── **qr.jpg**: Imagen de ejemplo de un código QR para pruebas.
│
├── **index.html**: El archivo HTML principal. La aplicación de Angular se carga aquí.
└── **styles.css**: Estilos globales para toda la aplicación.
```

---

## Puesta en Marcha

Sigue estos pasos para ejecutar el proyecto en un entorno de desarrollo local.

### Prerrequisitos

- Tener instalado [Node.js](https://nodejs.org/) (que incluye npm).
- Tener instalado [Angular CLI](https://angular.dev/tools/cli) de forma global: `npm install -g @angular/cli`.

### Instalación

1.  Clona o descarga el repositorio.
2.  Abre una terminal en la raíz del proyecto.
3.  Instala las dependencias del proyecto (incluyendo `ngx-scanner-qrcode`):
    ```bash
    npm install
    ```

### Ejecutar la Aplicación

1.  Ejecuta el siguiente comando para iniciar el servidor de desarrollo:
    ```bash
    ng serve
    ```
2.  Abre tu navegador y ve a `http://localhost:4200/`. La aplicación se recargará automáticamente si realizas cambios en los archivos fuente.

---

## Funcionamiento Crítico: Escaneo QR

El componente `qr-login.component.ts` es el corazón de la funcionalidad de registro.

1.  Al cargar, solicita permiso al navegador para acceder a la cámara del dispositivo.
2.  Inicia la librería `ngx-scanner-qrcode`, que muestra el video de la cámara en la interfaz.
3.  Cuando la librería detecta y decodifica un código QR válido, dispara un evento de éxito.
4.  El componente captura la información del QR y la procesa (por ejemplo, redirigiendo al usuario a la pantalla principal del kiosco).

**Nota importante**: Para que la cámara funcione, el sitio debe servirse a través de un contexto seguro (`localhost` o `https`). Si se accede a través de una IP de red local (ej. `192.168.1.100`), el navegador podría bloquear el acceso a la cámara por seguridad.

---

## Comandos de Angular CLI

Este proyecto fue generado con [Angular CLI](https://github.com/angular/angular-cli). A continuación, algunos comandos útiles.

- **Generar componentes**: `ng generate component nombre-componente`
- **Compilar para producción**: `ng build` (los artefactos se guardan en `dist/`)
- **Ejecutar tests unitarios**: `ng test`

---

## Registro de Cambios – 16/12/2025

- **Cámara y escaneo QR mejorados**: Ajustamos la inicialización del escáner (`qr-login.component.ts`) con una secuencia más robusta:
    - Solicitud y verificación de permisos de cámara antes de iniciar.
    - `constraints` de vídeo con dimensiones mínimas/ideales/máximas para mejor calidad: ancho 320/1280/1920, alto 240/720/1080.
    - Fallback de cámaras: primero `environment` (trasera), luego `user` (frontal) si falla.
    - Enumeración de dispositivos con `enumerateDevices()` y selector de cámara cuando hay múltiples.
    - Overlays de estado: loading, error con mensajes claros y opción de reintento.
    - Enfriamiento de lectura (3s) para evitar escaneos duplicados.

- **UI/UX del kiosco** (`kiosk.component.ts`):
    - Contenedor del escáner más grande y responsivo, con `object-fit: cover` para eliminar barras negras.
    - Mensajes animados de “Entrada registrada” y “Salida registrada” con estilos diferenciados.
    - Tarjeta informativa y tarjeta de verificación exitosa con datos del estudiante.
    - Temporizador de auto-ocultación de la información a los 5 segundos.

- **Lógica de negocio y Firebase** (`kiosk.service.ts`):
    - Integración con Firestore: colección `registroAsistencia` con campos en español (`idEstudiante`, `cedula`, `horaEntrada`, `horaSalida`, `codigoQR`, `marcaTiempo`, `marcaTiempoSalida`).
    - Flujo de check-in/check-out automático: si el mismo QR se escanea nuevamente, se registra la salida.
    - Cálculo y presentación de la duración de la sesión (formato Xh Ym Zs).
    - Estado de guardado para la UI (idle/saving/success/error) y fallback a `localStorage` ante fallos.
    - Reproducción opcional de sonido de éxito (`assets/success.mp3`).

- **Index y permisos** (`index.html`):
    - Idioma configurado a español y políticas de permisos adecuadas para cámara.

- **Documentación interna**:
    - `CAMERA_DEBUG_GUIDE.md`: guía de depuración de cámara y permisos.
    - `FIREBASE_STRUCTURE.md`: estructura y convenciones de la base de datos.

- **Git y merge**:
    - Resolución de conflictos tras `git pull`, manteniendo la funcionalidad avanzada.
    - Commits aplicados y `push` exitoso a `origin/main`.

### Implementado por

- Santy (santyT2) – desarrollo y pruebas en el entorno local.
- Asistencia técnica: GitHub Copilot – soporte en la implementación, resolución de conflictos y documentación.

---

## Registro de Cambios – 07/01/2026

- **Mejora en la Experiencia de Usuario y Personalización**:
    - **Consulta de Nombre del Estudiante**: Al escanear un QR, el sistema ahora utiliza la cédula del estudiante para consultar la colección `estudiantes` en Firestore y obtener su nombre completo. La consulta se realiza directamente por el ID del documento, que corresponde a la cédula, para máxima eficiencia.
    - **Mensaje de Bienvenida Personalizado**: Se ha reemplazado el mensaje genérico "Codigo escaneado:..." por un saludo personalizado. Ahora, la interfaz muestra "Bienvenido: [Nombre del Estudiante]".
    - **Visualización de Nombre en Tarjeta**: En la tarjeta de "Verificación Exitosa", se muestra el nombre completo del estudiante en lugar de su ID, haciendo la interfaz más clara y amigable.

- **Actualizaciones Técnicas**:
    - **`kiosk.service.ts`**: Se refactorizó para incluir un nuevo método `getStudentName(studentId)`, que utiliza `getDoc` de Firestore para una búsqueda directa por ID. Se añadió un nuevo observable `studentName$` para comunicar el nombre del estudiante a la UI.
    - **`kiosk.component.ts`**: El componente ahora se suscribe a `studentName$` para recibir el nombre y lo muestra dinámicamente en la plantilla. Se actualizó la lógica para limpiar el nombre del estudiante al cerrar sesión.

### Implementado por

- Byron Alvarez - Desarrollo en Angular.
- Asistente de IA de Gemini – desarrollo de la funcionalidad y actualización de la documentación.

---

## Base de Datos (Firestore) – Detalle de Manejo

Esta aplicación utiliza **Firebase Firestore** para registrar la asistencia mediante entradas y salidas asociadas a un código QR.

### Esquema de Colección

- **Colección**: `registroAsistencia`
- **Documento** (por registro de sesión):
    - `idEstudiante` (string): Identificador del estudiante. Si el QR sigue el formato `CEDULA10#DDMMYYYY`, se usa la cédula (10 dígitos).
    - `cedula` (string, opcional): Copia de la cédula si está disponible en el QR.
    - `horaEntrada` (Date): Fecha y hora de inicio de la sesión (generada en el cliente).
    - `horaSalida` (Date, opcional): Fecha y hora de cierre de la sesión.
    - `codigoQR` (string): Valor crudo del código escaneado.
    - `marcaTiempo` (Timestamp): `Timestamp.now()` para auditoría de creación.
    - `marcaTiempoSalida` (Timestamp, opcional): `Timestamp.now()` para auditoría de cierre.

> Definición de interfaz usada: ver [src/app/kiosk/kiosk.service.ts](src/app/kiosk/kiosk.service.ts) (`CheckInRecord`).

### Flujo de Operaciones

- **Check-in** (entrada):
    - Al escanear un código válido, se crea un documento nuevo en `registroAsistencia` con los campos anteriores.
    - Se guarda el `id` del documento creado en memoria (`previousCheckInId`) para relacionar el posterior check-out.
    - Se emite un mensaje de “Entrada registrada” y se muestra la hora.

- **Check-out** (salida):
    - Si se vuelve a escanear el **mismo** `codigoQR` mientras existe una sesión abierta (`previousCheckInId` no nulo), se actualiza ese documento con `horaSalida` y `marcaTiempoSalida`.
    - Se calcula la **duración de la sesión** en el cliente: diferencia entre `horaSalida` y `horaEntrada`, en formato `$Xh Ym Zs$`.

- **Logout**:
    - Al ejecutar `logout()`, se limpia el estado del cliente y, si hay sesión abierta, se registra un check-out automático.

- **Fallback local**:
    - Si Firestore falla al guardar, se persiste el check-in en `localStorage` bajo la clave `checkInRecords` con `studentId`, `cedula`, `checkInTime` y `timestamp`.

### Consultas Útiles (Ejemplos)

- **Sesiones por estudiante (últimas N)**:
    - Filtrar por `idEstudiante` y ordenar por `marcaTiempo` descendente.

- **Sesiones del día**:
    - Filtrar por rango de `marcaTiempo` (inicio/fin del día) y, opcionalmente, por `idEstudiante`.

- **Sesiones abiertas actuales**:
    - `horaSalida == null` para encontrar registros que siguen activos.

> Para rendimiento, se recomienda añadir índices compuestos si se realizan consultas combinadas (por ejemplo: `idEstudiante + marcaTiempo`).

### Reglas de Seguridad (Sugerencia)

Ejemplo orientativo de reglas; ajustar a tus requisitos de seguridad y roles:

```javascript
rules_version = '2';
service cloud.firestore {
    match /databases/{database}/documents {
        match /registroAsistencia/{docId} {
            allow read: if request.auth != null; // o reglas por rol
            allow create: if request.auth != null &&
                request.resource.data.idEstudiante is string &&
                request.resource.data.codigoQR is string &&
                request.resource.data.horaEntrada is timestamp;
            allow update: if request.auth != null &&
                request.resource.data.horaSalida is timestamp;
        }
    }
}
```

> Nota: En el cliente se usan `Date` para `horaEntrada/horaSalida`. Firestore serializa/deserializa según el SDK; valida tipos en el backend si aplicas reglas estrictas.

### Configuración de Entorno

- Archivo: [src/app/environments/environment.firebase.ts](src/app/environments/environment.firebase.ts)
    - Contiene el `firebaseConfig` necesario para inicializar la app y Firestore (ver [src/app/firebase/core.ts](src/app/firebase/core.ts)).
    - Asegúrate de usar claves/IDs correctos del proyecto Firebase.

### Componentes y Servicios Relacionados

- Escaneo y cámara: [src/app/kiosk/qr-login.component.ts](src/app/kiosk/qr-login.component.ts)
    - Inicializa cámara con `constraints`, maneja permisos, selección de dispositivo y estados de UI.

- Lógica de asistencia: [src/app/kiosk/kiosk.service.ts](src/app/kiosk/kiosk.service.ts)
    - `loginWithQr()` → crea check-in y gestiona check-out; calcula duración; estados de guardado.

- Interfaz de kiosco: [src/app/kiosk/kiosk.component.ts](src/app/kiosk/kiosk.component.ts)
    - Muestra mensajes, tarjetas de verificación, temporizador de auto-ocultación.

### Auditoría y Documentación

- Guías:
    - `CAMERA_DEBUG_GUIDE.md` – Resolución de problemas de cámara y permisos.
    - `FIREBASE_STRUCTURE.md` – Estructura de colecciones y convenciones.

### Responsables de los cambios

- Implementación de funcionalidad y ajustes UI/UX: Santy (santyT2).
- Asistencia técnica y documentación: GitHub Copilot.

---

## ¿Para qué sirve todo lo implementado?

Esta solución convierte el navegador en un **kiosco de asistencia** confiable y fácil de usar:

- **Registro sin fricción**: El estudiante solo muestra su QR. La cámara se inicia automáticamente, detecta el código y registra la asistencia.
- **Control de sesiones**: Cada lectura abre una sesión de asistencia (check‑in) y la siguiente lectura del mismo QR la cierra (check‑out) con la duración calculada.
- **Trazabilidad**: El registro queda en Firestore con marcas de tiempo para auditoría.
- **Operación estable**: Permisos, selección de cámara, overlays y reintentos hacen el flujo robusto ante fallos comunes.

En resumen, ahora tenemos un **punto de control** con persistencia en la nube, UX clara y mantenimiento sencillo.

## Flujo End‑to‑End (de punta a punta)

1. El usuario se acerca y coloca el QR frente a la cámara.
2. `qr-login.component.ts` verifica permisos y lista cámaras; inicia el escáner con `constraints` óptimos.
3. Al detectar el QR, **emite el valor** al `kiosk.service.ts`.
4. El servicio intenta parsear el QR (formato `CEDULA10#DDMMYYYY` o JSON); deriva `idEstudiante`.
5. Si no hay sesión abierta, **crea** un documento en `registroAsistencia` (check‑in) y muestra “Entrada registrada”.
6. Si hay una sesión abierta y el QR coincide, **actualiza** el mismo documento con `horaSalida` (check‑out), calcula duración y muestra “Salida registrada”.
7. UI se auto‑oculta en 5 segundos; el sistema queda listo para el siguiente estudiante.

> Cálculo de duración: $\text{duración} = t_{salida} - t_{entrada}$ → representación amigable `Xh Ym Zs`.

## Manejo de Estados en Cliente

- `student$`: ID visible en la tarjeta de verificación.
- `lastPayload$`: Valor crudo y parseado del QR.
- `checkInTime$`: Hora de entrada mostrada.
- `registroMensaje$`: “Entrada/Salida registrada”.
- `duracionSesion$`: Texto de duración al hacer salida.
- `saveStatus$` y `saveError$`: Estado del guardado y errores para feedback de UI.

## Errores y Recuperación

- **Permisos denegados**: Mensaje explicando cómo habilitar cámara.
- **Cámara ocupada/no encontrada**: Reintento, cambio de `facingMode`, selector de dispositivo.
- **Contexto inseguro (HTTP)**: Aviso de requerir HTTPS/localhost.
- **Fallo al guardar en Firestore**: Fallback en `localStorage` con datos mínimos para no perder el evento.

## Rendimiento y UX

- `constraints` de vídeo optimizados para calidad sin sobrecargar.
- `object-fit: cover` para ocupar el contenedor sin barras.
- **Cooldown de 3s**: evita lecturas repetidas y ruido.
- **Overlays de loading/success/error**: estado claro para el usuario.
- **Auto‑ocultación en 5s**: la pantalla vuelve al modo “lista para escanear”.

## Pruebas Rápidas (operación)

1. Inicia desarrollo: 
     ```bash
     ng serve
     ```
2. Muestra un QR válido (ej. `1234567890#16122025`).
3. Verifica “Entrada registrada” y que Firestore reciba el documento.
4. Lee el **mismo** QR de nuevo y confirma “Salida registrada” con duración.
5. Prueba selector de cámara si el equipo tiene múltiples dispositivos.

## Despliegue y Operación

- Build de producción:
    ```bash
    ng build
    ```
- Servir bajo **HTTPS** para acceso a cámara.
- Supervisar la colección `registroAsistencia` en consola de Firebase para auditoría.

## Métricas y Auditoría

- `marcaTiempo` y `marcaTiempoSalida` facilitan filtros por día, turnos y control de permanencia.
- Duración de sesión apoya métricas de ocupación de laboratorio.

## Roadmap Sugerido

- Validación contra padrón de estudiantes (API interna).
- Panel de administración con filtros y exportación (CSV/Excel).
- Notificaciones (ej. tiempo excedido en sesión).
- Modo offline con sincronización diferida.
- Mejora de reglas de seguridad y roles.

## Créditos

- **Santy (santyT2)**: Desarrollo funcional, UI/UX, pruebas y operaciones locales.
- **GitHub Copilot**: Asistencia técnica, resolución de conflictos, documentación y soporte en flujo.
