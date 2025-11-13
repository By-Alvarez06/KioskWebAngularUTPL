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
- **[html5-qrcode](https://github.com/mebjas/html5-qrcode)**: Librería externa para acceder a la cámara y decodificar los códigos QR.
- **HTML5 y CSS**: Para la estructura y el estilo de la aplicación.

---

## Estructura del Proyecto

A continuación se describen los archivos y directorios más importantes para el funcionamiento del kiosco.

```
/src
├── /app
│   ├── /kiosk
│   │   ├── **qr-login.component.ts**: Componente CRÍTICO. Contiene toda la lógica para activar la cámara, escanear el código QR y emitir el resultado. Utiliza la librería `html5-qrcode`.
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
├── **styles.css**: Estilos globales para toda la aplicación.
└── **typings-html5-qrcode.d.ts**: Archivo de declaración de tipos de TypeScript. Es **esencial** para que TypeScript entienda la librería `html5-qrcode`, que es de Javascript, permitiendo su uso sin errores de compilación.
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
3.  Instala las dependencias del proyecto (incluyendo `html5-qrcode`):
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
2.  Inicia la librería `html5-qrcode`, que muestra el video de la cámara en la interfaz.
3.  Cuando la librería detecta y decodifica un código QR válido, dispara un evento de éxito.
4.  El componente captura la información del QR y la procesa (por ejemplo, redirigiendo al usuario a la pantalla principal del kiosco).

**Nota importante**: Para que la cámara funcione, el sitio debe servirse a través de un contexto seguro (`localhost` o `https`). Si se accede a través de una IP de red local (ej. `192.168.1.100`), el navegador podría bloquear el acceso a la cámara por seguridad.

---

## Comandos de Angular CLI

Este proyecto fue generado con [Angular CLI](https://github.com/angular/angular-cli). A continuación, algunos comandos útiles.

- **Generar componentes**: `ng generate component nombre-componente`
- **Compilar para producción**: `ng build` (los artefactos se guardan en `dist/`)
- **Ejecutar tests unitarios**: `ng test`
