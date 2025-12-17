import { Component, OnInit, Injector, Inject, PLATFORM_ID, ViewChild } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { QrLoginComponent } from './qr-login.component';
import { KioskService } from './kiosk.service';
import { LoggingService } from '../logging/logging.service';

// KioskComponent: Componente principal para la interfaz de quiosco
// Muestra la interfaz de usuario para la verificación de estudiantes mediante códigos QR.

@Component({
  selector: 'app-kiosk',
  standalone: true,
  imports: [CommonModule, QrLoginComponent],
  template: `
    <div class="kiosk-root">
      <div class="wave-bg"></div>
      <header class="kiosk-header">
        <div class="container text-center">
          <div class="row align-items-start">
            <div class="col-3">
              <img class='imgLogo' src="img/utpl.png" alt="UTPL Logo">
            </div>
            <div class="col-6">
              <h1>Verificación de Estudiantes</h1>
              <p class="subtitle">Sistema de Control de Acceso QR</p>
            </div>
            <div class="col-3">
              <img class='imgLogo' src="img/xrlab1.png" alt="XRLab Logo">
            </div>
          </div>
        </div>
      </header>
      
      <main class="kiosk-content">
        <div class="scanner-section">
          <div class="scanner-container">
            <app-qr-login #qrLogin></app-qr-login>
          </div>
          <div class="scanner-info">
            <!-- Mensaje de Entrada/Salida Registrada -->
            <div class="registro-mensaje" *ngIf="registroMensaje" [class.entrada]="registroMensaje.includes('Entrada')" [class.salida]="registroMensaje.includes('Salida')">
              <div class="mensaje-texto">{{ registroMensaje }}</div>
              <div class="duracion-sesion" *ngIf="duracionSesion && registroMensaje.includes('Salida')">
                Duración de la sesión: <strong>{{ duracionSesion }}</strong>
              </div>
            </div>

            <div class="info-card" *ngIf="!studentId && !registroMensaje">
              <h2>Escanee su código QR</h2>
              <p>Coloque el código QR frente a la cámara para verificar su identidad</p>
              <img src="img/qr-copia.jpg" alt="QR Code Example">
            </div>
            <div class="info-card success" *ngIf="studentId">
              <h2>Verificación Exitosa</h2>
              <div class="student-info">
                <p class="info-label">ID Estudiante:</p>
                <p class="info-value">{{ studentId }}</p>
                <ng-container *ngIf="lastPayload?.parsed?.cedula">
                  <p class="info-label">Cédula:</p>
                  <p class="info-value">{{ lastPayload?.parsed?.cedula }}</p>
                </ng-container>
                <ng-container *ngIf="checkInTime">
                  <p class="info-label">Hora de Entrada:</p>
                  <p class="info-value">{{ checkInTime | date: 'HH:mm:ss' }}</p>
                </ng-container>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100vh;
        width: 100vw;
        background: var(--background-color);
      }

      .imgLogo {
        max-height: 80px;
      }
      
      .kiosk-root {
        height: 100%;
        display: flex;
        flex-direction: column;
      }

      .kiosk-header {
        background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
        color: white;
        padding: 1.5rem 2rem;
        text-align: center;
      }

      .kiosk-header h1 {
        margin: 0;
        font-size: 2rem;
        font-weight: 600;
      }

      .subtitle {
        margin: 0.5rem 0 0;
        opacity: 0.9;
        font-size: 1.1rem;
      }

      .kiosk-content {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2rem;
      }

      .scanner-section {
        display: flex;
        gap: 2.5rem;
        max-width: 1400px;
        width: 100%;
        height: 700px;
        background: white;
        border-radius: 20px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.1);
        padding: 2.5rem;
        animation: fadeInUp 0.5s ease-out;
      }

      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .scanner-container {
        flex: 1.5;
        min-width: 500px;
        height: 100%;
        background: linear-gradient(135deg, rgba(59, 130, 246, 0.05), rgba(147, 51, 234, 0.05));
        border-radius: 16px;
        padding: 0.5rem;
        border: 2px solid rgba(59, 130, 246, 0.1);
        box-shadow: 0 4px 6px rgba(0,0,0,0.05);
        display: flex;
        align-items: stretch;
        justify-content: center;
      }

      .scanner-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        position: relative;
        min-width: 380px;
      }

      .registro-mensaje {
        position: absolute;
        top: -10px;
        left: 0;
        right: 0;
        padding: 1.5rem;
        border-radius: 12px;
        text-align: center;
        animation: slideDown 0.4s ease-out;
        z-index: 100;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      }

      .mensaje-texto {
        font-weight: bold;
        font-size: 1.3rem;
        margin-bottom: 0.5rem;
      }

      .duracion-sesion {
        font-size: 1.1rem;
        margin-top: 0.8rem;
        padding-top: 0.8rem;
        border-top: 2px solid rgba(255,255,255,0.3);
      }

      .duracion-sesion strong {
        font-size: 1.4rem;
        display: block;
        margin-top: 0.3rem;
      }

      .registro-mensaje.entrada {
        background: linear-gradient(135deg, #10B981, #059669);
        color: white;
      }

      .registro-mensaje.salida {
        background: linear-gradient(135deg, #F59E0B, #D97706);
        color: white;
      }

      @keyframes slideDown {
        0% {
          transform: translateY(-30px);
          opacity: 0;
        }
        70% {
          transform: translateY(5px);
        }
        100% {
          transform: translateY(0);
          opacity: 1;
        }
      }

      .info-card {
        background: white;
        border-radius: 16px;
        padding: 2rem;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        animation: fadeIn 0.4s ease-in-out;
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: center;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: scale(0.95);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }

      .info-card h2 {
        margin: 0 0 2rem;
        color: var(--primary-color);
        font-size: 2rem;
        text-align: center;
      }

      .info-card p {
        margin: 0.5rem 0;
        color: var(--text-color);
        font-size: 1.1rem;
      }

      .info-card img {
        max-width: 250px;
        margin: 1.5rem auto;
        display: block;
        opacity: 0.8;
      }

      .success {
        border-left: 5px solid #10B981;
        background: linear-gradient(to right, #ecfdf5 0%, white 20%);
      }

      .error-card {
        border-left: 4px solid #EF4444;
      }
      
      .error-message {
        background: #FEE2E2;
        color: #B91C1C;
        padding: 1rem;
        border-radius: 8px;
        margin-bottom: 1rem;
      }

      .student-info {
        margin: 1.5rem 0;
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 1.5rem 2rem;
        background: #f9fafb;
        padding: 1.8rem;
        border-radius: 12px;
      }

      .info-label {
        color: #6b7280;
        font-weight: 500;
        font-size: 1.1rem;
      }

      .info-value {
        color: #111827;
        font-weight: 600;
        font-size: 1.4rem;
      }

      .action-button {
        background: var(--primary-color);
        color: white;
        border: none;
        padding: 0.75rem 1.5rem;
        border-radius: var(--border-radius);
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s;
        width: 100%;
        margin-top: 1rem;
      }

      .action-button:hover {
        background: var(--secondary-color);
      }

      @media (max-width: 768px) {
        .scanner-section {
          flex-direction: column;
          height: auto;
          padding: 1.5rem;
        }
        
        .scanner-container {
          min-height: 400px;
          min-width: 100%;
        }

        .scanner-info {
          min-width: 100%;
        }

        .info-card h2 {
          font-size: 1.5rem;
        }

        .info-value {
          font-size: 1.2rem;
        }
      }
    `,
  ],
})
export class KioskComponent implements OnInit {
  @ViewChild('qrLogin') qrLogin!: QrLoginComponent;
  studentId: string | null = null;
  lastPayload: { raw: string; parsed?: any } | null = null;
  checkInTime: Date | null = null;
  registroMensaje: string = '';
  duracionSesion: string = '';
  private autoHideTimer: any;

  constructor(
    private kiosk: KioskService, 
    @Inject(PLATFORM_ID) private platformId: Object,
    private logging: LoggingService
  ) {}

  ngOnInit(): void {
    this.kiosk.student$.subscribe((id) => {
      this.studentId = id;
      
      // Si hay un studentId, iniciar el timer de 5 segundos
      if (id) {
        // Limpiar timer anterior si existe
        if (this.autoHideTimer) {
          clearTimeout(this.autoHideTimer);
        }
        
        // Nuevo timer de 5 segundos - ocultar toda la información
        this.autoHideTimer = setTimeout(() => {
          this.studentId = null;
          this.checkInTime = null;
          this.lastPayload = null;
        }, 5000);
      }
    });
    
    this.kiosk.lastPayload$.subscribe((p) => {
      this.lastPayload = p;
    });
    
    this.kiosk.checkInTime$.subscribe((time) => {
      this.checkInTime = time;
    });

    this.kiosk.registroMensaje$.subscribe((msg) => {
      this.registroMensaje = msg;
    });

    this.kiosk.duracionSesion$.subscribe((duracion) => {
      this.duracionSesion = duracion;
    });
  }

  logout() {
    this.kiosk.logout();
    this.studentId = null;
    this.checkInTime = null;
    if (this.qrLogin) {
      this.qrLogin.resetScanner();
    }
  }
}
