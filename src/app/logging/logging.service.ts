import { Injectable } from '@angular/core';
import { KioskService } from '../kiosk/kiosk.service';

@Injectable({
  providedIn: 'root'
})
export class LoggingService {
  private lastPayload: { raw: string; parsed?: any } | null = null;

  constructor(private kiosk: KioskService) {
    // Suscribirse a lastPayload para mantener el último valor (solo memoria, sin escrituras a Firestore)
    this.kiosk.lastPayload$.subscribe(payload => {
      this.lastPayload = payload;
    });
    // Se elimina la escritura en la colección 'registros' para evitar redundancia.
    // El único origen de verdad será 'registroAsistencia' y 'estudiantes', manejado por KioskService.
  }
}