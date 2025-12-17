import { Component, ViewChild, AfterViewInit, OnDestroy, Injector, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { NgxScannerQrcodeComponent, ScannerQRCodeConfig, ScannerQRCodeResult } from 'ngx-scanner-qrcode';
import { KioskService } from './kiosk.service';

@Component({
  selector: 'app-qr-login',
  standalone: true,
  imports: [CommonModule, NgxScannerQrcodeComponent],
  template: `
    <div class="qr-container">
      <div class="camera-wrapper" *ngIf="isBrowser">
        <ngx-scanner-qrcode
          #scanner="scanner"
          [config]="config"
          (event)="onEvent($event)"
          (error)="onError($event)">
        </ngx-scanner-qrcode>
        
        <!-- Overlay Visual -->
        <div class="scanner-overlay" *ngIf="!isLoading">
          <div class="scan-region"></div>
        </div>

        <!-- Loading Spinner -->
        <div class="loading-overlay" *ngIf="isLoading">
          <div class="spinner"></div>
          <p>Iniciando cámara...</p>
        </div>

        <!-- Error State -->
        <div class="error-overlay" *ngIf="isError">
          <p class="error-text">{{ errorMessage }}</p>
          
          <div class="device-selection" *ngIf="devices.length > 0">
            <select (change)="onDeviceSelect($event)" class="form-select">
              <option value="" disabled selected>Seleccionar otra cámara</option>
              <option *ngFor="let device of devices" [value]="device.deviceId">
                {{ device.label || 'Cámara ' + (devices.indexOf(device) + 1) }}
              </option>
            </select>
          </div>

          <button (click)="retry()" class="btn-retry">Reintentar</button>
        </div>
      </div>

      <!-- Status Messages -->
      <div class="status-bar" *ngIf="statusMessage" [class.success]="isSuccess">
        {{ statusMessage }}
      </div>
    </div>
  `,
  styles: [`
    .qr-container {
      position: relative;
      width: 100%;
      height: 100%;
      background: #000;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      border-radius: 12px;
    }
    .camera-wrapper {
      flex: 1;
      position: relative;
      width: 100%;
      height: 100%;
      display: flex;
      z-index: 1;
    }
    ::ng-deep ngx-scanner-qrcode {
      width: 100%;
      height: 100%;
      display: flex;
      z-index: 1;
    }
    ::ng-deep ngx-scanner-qrcode video {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 12px;
      z-index: 1;
    }
    .scanner-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      z-index: 5;
    }
    .scan-region {
      width: 250px;
      height: 250px;
      border: 2px solid rgba(255, 255, 255, 0.8);
      border-radius: 16px;
      box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
    }
    .loading-overlay, .error-overlay {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: #000;
      color: white;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 10;
    }
    .error-text {
      color: #ff6b6b;
      margin-bottom: 20px;
      text-align: center;
      padding: 0 20px;
    }
    .btn-retry {
      padding: 10px 20px;
      background: #339af0;
      border: none;
      border-radius: 4px;
      color: white;
      font-weight: bold;
      cursor: pointer;
    }
    .status-bar {
      position: absolute;
      bottom: 30px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0,0,0,0.8);
      color: white;
      padding: 10px 20px;
      border-radius: 20px;
      font-size: 14px;
      z-index: 20;
    }
    .status-bar.success {
      background: #2ecc71;
    }
    .device-selection {
      margin-bottom: 15px;
    }
    select {
      padding: 8px;
      border-radius: 4px;
    }
    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #f3f3f3;
      border-top: 4px solid #3498db;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 10px;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `]
})
export class QrLoginComponent implements AfterViewInit, OnDestroy {
  @ViewChild('scanner') scanner!: NgxScannerQrcodeComponent;

  isBrowser: boolean;
  isLoading = true;
  isError = false;
  isSuccess = false;
  errorMessage = '';
  statusMessage = 'Inicializando cámara...';
  
  devices: MediaDeviceInfo[] = [];
  
  // Configuration for the scanner
  config: ScannerQRCodeConfig = {
    constraints: {
      video: {
        facingMode: 'environment',
        // Agregar dimensiones mínimas para mejor rendimiento
        width: { min: 320, ideal: 1280, max: 1920 },
        height: { min: 240, ideal: 720, max: 1080 }
      }
    }
  };

  private lastScanTime = 0;
  private scanCooldown = 3000; // 3 seconds between successful scans

  constructor(
    private injector: Injector,
    private kiosk: KioskService,
    private cd: ChangeDetectorRef,
    private ngZone: NgZone
  ) {
    this.isBrowser = isPlatformBrowser(this.injector.get(PLATFORM_ID));
  }

  ngAfterViewInit(): void {
    if (this.isBrowser) {
      // Pequeño delay para asegurar que la vista esté lista
      setTimeout(() => this.initializeCamera(), 500);
    }
  }

  private async checkCameraPermission(): Promise<boolean> {
    try {
      // Verificar permiso sin solicitar (si ya fue denegado antes)
      const permission = await (navigator as any).permissions?.query({ name: 'camera' });
      console.log('Camera permission state:', permission?.state);
      return permission?.state !== 'denied';
    } catch (e) {
      // Si permissions API no está disponible, continuar de todas formas
      console.warn('Permissions API no disponible, continuando...');
      return true;
    }
  }

  ngOnDestroy(): void {
    this.stopCamera();
  }

  private currentDeviceIndex = 0;
  private attemptGeneric = false;
  private permissionGranted = false;

  private async initializeCamera() {
    this.isLoading = true;
    this.isError = false;
    this.statusMessage = 'Inicializando cámara...';
    this.cd.detectChanges();

    try {
      // Verificar permiso primero
      const hasPermission = await this.checkCameraPermission();
      if (!hasPermission) {
        throw new Error('PermissionDeniedError');
      }

      // Cargar dispositivos disponibles
      await this.loadDevices();

      // Intentar con el primer dispositivo o genérico
      this.startScanner();
      
    } catch (e: any) {
      this.handleError(e);
    }
  }

  private startScanner() {
    this.ngZone.runOutsideAngular(() => {
      try {
        // Reconfigurar el scanner con los constraints actuales
        this.scanner.config = { ...this.config };
        const startResult = this.scanner.start();
        
        const handleSuccess = () => {
          this.ngZone.run(() => {
            this.isLoading = false;
            this.isError = false;
            this.statusMessage = 'Escáner listo. Apunte al código.';
            console.log('✅ Cámara iniciada correctamente');
            this.cd.detectChanges();
          });
        };

        const handleFailure = (err: any) => {
          this.ngZone.run(() => {
            console.warn('Fallo al iniciar cámara:', err?.message || err);
            this.tryNextCamera(err);
          });
        };

        if (startResult && typeof startResult.subscribe === 'function') {
          startResult.subscribe({ next: handleSuccess, error: handleFailure });
        } else if (startResult instanceof Promise) {
          startResult.then(handleSuccess).catch(handleFailure);
        } else {
          handleSuccess();
        }
      } catch (err: any) {
        this.ngZone.run(() => {
          console.error('Error critico al iniciar escanner:', err);
          this.tryNextCamera(err);
        });
      }
    });
  }

  private tryNextCamera(lastError: any) {
    // Estrategia de fallback:
    // 1. Intenta genérico 'environment' (cámara trasera preferida)
    // 2. Si falla, intenta 'user' (cámara frontal)
    // 3. Si todo falla, mostrar error

    if (!this.attemptGeneric) {
      console.log('Intentando configuración genérica (environment - cámara trasera)...');
      this.attemptGeneric = true;
      
      // Resetear index de dispositivos
      this.currentDeviceIndex = 0;
      
      this.config.constraints = {
        video: {
          facingMode: 'environment',
          width: { min: 320, ideal: 1280, max: 1920 },
          height: { min: 240, ideal: 720, max: 1080 }
        }
      };
      
      // Reintentar
      setTimeout(() => this.startScanner(), 200);
      return;
    }

    // Si environment falló, intentar user (frontal)
    console.log('Intentando configuración user (cámara frontal)...');
    this.config.constraints = {
      video: {
        facingMode: 'user',
        width: { min: 320, ideal: 1280, max: 1920 },
        height: { min: 240, ideal: 720, max: 1080 }
      }
    };
    
    setTimeout(() => {
      this.startScanner();
      
      // Si todo falla después de 2 segundos, mostrar error
      setTimeout(() => {
        if (this.isError) return;
        this.handleError(lastError);
      }, 2000);
    }, 200);
  }

  private async loadDevices() {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        console.warn('enumerateDevices no disponible');
        return;
      }

      const allDevices = await navigator.mediaDevices.enumerateDevices();
      this.devices = allDevices.filter(d => d.kind === 'videoinput');
      
      console.log(`📷 Dispositivos de video encontrados: ${this.devices.length}`);
      this.devices.forEach((d, i) => {
        console.log(`  ${i + 1}. ${d.label || `Cámara anónima #${i + 1}`}`);
      });

      // Ordenar: cámaras traseras primero
      this.devices.sort((a, b) => {
        const aBack = a.label.toLowerCase().includes('back') || a.label.toLowerCase().includes('trasera');
        const bBack = b.label.toLowerCase().includes('back') || b.label.toLowerCase().includes('trasera');
        return (bBack ? 1 : 0) - (aBack ? 1 : 0);
      });
      
    } catch (e: any) {
      console.warn('Error enumerando dispositivos:', e?.message || e);
      this.devices = [];
    }
  }

  onEvent(e: ScannerQRCodeResult[]) {
    if (!e || e.length === 0) return;

    const rawValue = e[0].value;
    const now = Date.now();

    // Prevent duplicate scans within cooldown period
    if (now - this.lastScanTime < this.scanCooldown) {
      return;
    }

    if (rawValue) {
      this.lastScanTime = now;
      this.handleSuccessfulScan(rawValue);
    }
  }

  handleSuccessfulScan(code: string) {
    this.isSuccess = true;
    this.statusMessage = 'Código detectado: ' + code;
    this.kiosk.playSuccessSound();
    
    // Process login
    this.kiosk.loginWithQr(code);

    // Reset UI after 4 seconds (para que vea la hora de entrada)
    setTimeout(() => {
      this.isSuccess = false;
      this.statusMessage = 'Escáner listo. Apunte al código.';
      // No hacer logout - dejar que el siguiente QR cierre la sesión anterior
      this.cd.detectChanges();
    }, 4000);
  }

  onError(e: any) {
    this.handleError(e);
  }

  handleError(error: any) {
    console.error('QR Error:', error?.name || error?.message || error);
    
    this.isLoading = false;
    this.isError = true;
    this.statusMessage = '';
    
    // Mensajes específicos según el tipo de error
    const errorName = error?.name || '';
    if (errorName.includes('NotAllowed') || errorName.includes('PermissionDenied')) {
      this.errorMessage = 'Permiso de cámara denegado. Permite el acceso en la configuración del navegador.';
    } else if (errorName.includes('NotFound') || errorName.includes('DevicesNotFound')) {
      this.errorMessage = 'No se encontró cámara. Verifica que tu dispositivo tenga cámara conectada.';
    } else if (errorName.includes('NotReadable')) {
      this.errorMessage = 'La cámara está siendo usada por otra aplicación. Ciérrala e intenta de nuevo.';
    } else if (errorName.includes('Security')) {
      this.errorMessage = 'Se requiere HTTPS para acceder a la cámara.';
    } else {
      this.errorMessage = `Error: ${error?.message || 'Error desconocido al acceder a la cámara'}`;
    }
    
    this.cd.detectChanges();
  }

  retry() {
    this.stopCamera();
    setTimeout(() => {
        this.currentDeviceIndex = 0;
        this.attemptGeneric = false;
        this.initializeCamera();
    }, 500);
  }

  resetScanner() {
    this.isSuccess = false;
    this.isError = false;
    this.statusMessage = 'Escáner listo. Apunte al código.';
    this.isLoading = false;
    // Si la cámara estaba detenida o en error, intentar reiniciarla
    if (!this.scanner.isStart) {
      this.retry();
    }
    this.cd.detectChanges();
  }

  stopCamera() {
    if (this.scanner) {
      this.scanner.stop();
    }
  }

  onDeviceSelect(event: Event) {
    const select = event.target as HTMLSelectElement;
    const deviceId = select.value;
    
    if (deviceId) {
      if (!this.config.constraints) {
        this.config.constraints = {};
      }
      this.config.constraints.video = { deviceId: deviceId };
      this.retry();
    }
  }
}
