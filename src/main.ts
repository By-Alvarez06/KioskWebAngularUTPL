import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { LOAD_WASM } from 'ngx-scanner-qrcode';

// Load WASM module for ngx-scanner-qrcode (only in browser)
if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  LOAD_WASM('assets/wasm/ngx-scanner-qrcode.wasm').subscribe();
}

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
