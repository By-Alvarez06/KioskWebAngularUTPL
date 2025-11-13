import { Component, ViewChild, OnInit, AfterViewInit, Injector } from '@angular/core';
import { CommonModule } from '@angular/common';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { NgxScannerQrcodeComponent } from 'ngx-scanner-qrcode';
import { KioskService } from './kiosk.service';

@Component({
  selector: 'app-qr-login',
  standalone: true,
  imports: [CommonModule, NgxScannerQrcodeComponent],
  template: `
    <div class="qr-container">
      <div class="camera-frame" *ngIf="isBrowser">
        <ngx-scanner-qrcode
          #scanner="scanner"
          [isBeep]="true"
          [isMasked]="true"
          [vibrate]="300"
        ></ngx-scanner-qrcode>
        <div class="scanner-overlay">
          <div class="scan-region"></div>
        </div>
      </div>
      <div class="camera-frame" *ngIf="!isBrowser" style="background: #333; display: flex; align-items: center; justify-content: center;">
        <p style="color: #999;">Escáner no disponible en este contexto</p>
      </div>
      <p *ngIf="message" class="status-message">{{ message }}</p>
    </div>
  `,
  styles: [
    `
      .qr-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 100%;
        height: 100%;
        flex: 1;
      }

      .camera-frame {
        position: relative;
        width: 100%;
        height: 100%;
        min-height: 300px;
        overflow: hidden;
        border-radius: var(--border-radius);
        background: #000;
        flex: 1;
      }

      ::ng-deep ngx-scanner-qrcode {
        width: 100% !important;
        height: 100% !important;
        display: block !important;
      }

      ::ng-deep .ngx-scanner-qrcode {
        width: 100% !important;
        height: 100% !important;
      }

      ::ng-deep ngx-scanner-qrcode video {
        width: 100% !important;
        height: 100% !important;
        object-fit: cover !important;
        border-radius: var(--border-radius);
        display: block !important;
      }

      .scanner-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.1);
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: none;
      }

      .scan-region {
        width: 260px;
        height: 260px;
        border: 2px solid white;
        border-radius: 12px;
        box-shadow: 0 0 0 9999px rgba(0,0,0,0.5);
      }

      .status-message {
        position: absolute;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0,0,0,0.7);
        color: white;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 0.9rem;
      }
    `,
  ],
})
export class QrLoginComponent implements OnInit, AfterViewInit {
  @ViewChild('scanner') scanner!: NgxScannerQrcodeComponent;
  
  message = 'Apunta la cámara al código QR del estudiante.';
  scannedOnce = false;
  isBrowser = false;

  constructor(private kiosk: KioskService, private injector: Injector) {
    this.isBrowser = isPlatformBrowser(this.injector.get(PLATFORM_ID));
  }

  ngOnInit(): void {
    // Only initialize in browser environment
    if (!this.isBrowser) {
      this.message = 'El escáner no está disponible en este contexto.';
      return;
    }
  }

  ngAfterViewInit(): void {
    if (this.scanner && this.isBrowser && !this.scannedOnce) {
      // Subscribe to scanner data FIRST before starting
      this.scanner.data.subscribe((results: any) => {
        if (results && results.length > 0 && !this.scannedOnce) {
          const firstResult = results[0];
          const qrValue = firstResult.value;
          
          if (qrValue && qrValue.trim().length > 0) {
            this.scannedOnce = true;
            this.message = `QR escaneado: ${qrValue}`;
            this.kiosk.loginWithQr(qrValue);
            
            // Stop scanner after successful scan
            if (this.scanner && this.scanner.isStart) {
              this.scanner.stop();
            }
            
            setTimeout(() => {
              this.message = `Bienvenido (ID): ${qrValue}`;
            }, 500);
          }
        }
      });

      // Wait for WASM to be ready, then start scanner
      if (this.scanner.isReady) {
        this.scanner.isReady.subscribe(() => {
          if (this.scanner && !this.scanner.isStart) {
            this.scanner.start();
            console.log('Scanner started');
          }
        });
      } else {
        // Fallback: start after a delay
        setTimeout(() => {
          if (this.scanner && !this.scanner.isStart) {
            this.scanner.start();
            console.log('Scanner started (fallback)');
          }
        }, 1000);
      }
    }
  }

  resetScanner(): void {
    this.scannedOnce = false;
    this.message = 'Apunta la cámara al código QR del estudiante.';
    if (this.scanner && !this.scanner.isStart) {
      this.scanner.start();
    }
  }
}
