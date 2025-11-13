# AngularProyect

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 20.3.8.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Modo Kiosk (Login por QR)

Este proyecto incluye una interfaz básica de Kiosk pensada para operaciones controladas: el flujo principal es el login de estudiantes mediante escaneo de un código QR con la cámara.

Pasos para ejecutar en modo kiosk localmente:

1. Instalar dependencias (añadimos `html5-qrcode` para escanear desde la cámara):

```powershell
npm install
```

2. Iniciar la app:

```powershell
npm start
```

3. Abrir `http://localhost:4200/`. La ruta por defecto es la interfaz Kiosk que intentará solicitar pantalla completa y acceso a la cámara.

Notas y recomendaciones:
- El componente de escaneo usa la librería `html5-qrcode` cargada dinámicamente. Si el navegador no otorga permisos de cámara, mostrará un mensaje de error.
- Para pruebas con dispositivos sin cámara puedes modificar `src/app/kiosk/qr-login.component.ts` para leer QR desde imágenes.
- Esta implementación es una base; para producción se debe validar el contenido del QR contra un backend seguro y agregar mecanismos de bloqueo del navegador/OS más estrictos según el dispositivo kiosk.


## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
