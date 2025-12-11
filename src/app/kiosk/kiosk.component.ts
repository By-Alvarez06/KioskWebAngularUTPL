import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QrLoginComponent } from './qr-login.component';
import { KioskService } from './kiosk.service';

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
            <app-qr-login></app-qr-login>
          </div>
          <div class="scanner-info">
            <div class="info-card" *ngIf="!studentId">
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
                  <p class="info-label">Fecha:</p>
                  <p class="info-value">{{ lastPayload?.parsed?.dateDisplay }}</p>
                </ng-container>
              </div>
              <button class="action-button" (click)="logout()">
                Cerrar Sesión
              </button>
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
        gap: 2rem;
        max-width: 1200px;
        width: 100%;
        background: white;
        border-radius: var(--border-radius);
        box-shadow: var(--box-shadow);
        padding: 2rem;
      }

      .scanner-container {
        flex: 1;
        min-width: 320px;
        background: rgba(0, 0, 0, 0.03);
        border-radius: var(--border-radius);
        padding: 1rem;
      }

      .scanner-info {
        flex: 1;
        display: flex;
        flex-direction: column;
      }

      .info-card {
        background: white;
        border-radius: var(--border-radius);
        padding: 1.5rem;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      }

      .info-card h2 {
        margin: 0 0 1rem;
        color: var(--primary-color);
        font-size: 1.5rem;
      }

      .info-card p {
        margin: 0.5rem 0;
        color: var(--text-color);
      }

      .success {
        border-left: 4px solid #10B981;
      }

      .student-info {
        margin: 1.5rem 0;
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 0.5rem 1rem;
      }

      .info-label {
        color: var(--text-color);
        opacity: 0.7;
        font-weight: 500;
      }

      .info-value {
        color: var(--text-color);
        font-weight: 600;
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
        }
        
        .scanner-container {
          min-height: 320px;
        }
      }
    `,
  ],
})
export class KioskComponent implements OnInit {
  studentId: string | null = null;
  lastPayload: { raw: string; parsed?: any } | null = null;

  constructor(private kiosk: KioskService) {}

  ngOnInit(): void {
    // request fullscreen when kiosk starts
    try {
      const doc: any = document.documentElement as any;
      if (doc.requestFullscreen) {
        void doc.requestFullscreen();
      } else if (doc.webkitRequestFullscreen) {
        // Safari
        doc.webkitRequestFullscreen();
      }
    } catch (err) {
      // ignore if not allowed
    }

    this.kiosk.student$.subscribe((id) => (this.studentId = id));
    this.kiosk.lastPayload$.subscribe((p) => (this.lastPayload = p));
  }

  logout() {
    this.kiosk.logout();
    // after logout, optionally return to scan view
    this.studentId = null;
  }
}
