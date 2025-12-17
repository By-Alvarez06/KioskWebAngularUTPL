import { Injectable } from '@angular/core';
import { KioskService } from '../kiosk/kiosk.service';
import { CoreFirebaseService } from '../firebase/core';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';

@Injectable({
  providedIn: 'root'
})
export class LoggingService {
  private currentSessionId: string | null = null;
  private lastPayload: { raw: string; parsed?: any } | null = null;

  constructor(
    private kiosk: KioskService, 
    private core: CoreFirebaseService
  ) {
    // Suscribirse a lastPayload para mantener el último valor
    this.kiosk.lastPayload$.subscribe(payload => {
      this.lastPayload = payload;
    });

    // Suscribirse a cambios en studentId para registrar entrada/salida
    this.kiosk.student$.subscribe(async (studentId) => {
      if (studentId) {
        // Entrada: registrar cuando hay un nuevo studentId
        this.kiosk.setSaveStatus('saving');
        try {
          const payload = this.lastPayload ? this.lastPayload.raw : '';
          const docRef = await addDoc(collection(this.core.firestore, 'registros'), {
            studentId: studentId,
            entrada: new Date(),
            payload: payload
          });
          this.currentSessionId = docRef.id;
          // La entrada se registró correctamente.
          this.kiosk.setSaveStatus('success');
        } catch (error: any) {
          // TODO: Implementar un sistema de reintentos o una cola offline.
          // Es crítico que el registro de entrada no falle silenciosamente.
          console.error('Error CRÍTICO al registrar entrada en Firebase:', error);
          this.kiosk.setSaveStatus('error', error.message || 'Error desconocido al guardar');
        }
      } else {
        // Salida: registrar cuando studentId es null
        if (this.currentSessionId) {
          try {
            await updateDoc(doc(this.core.firestore, 'registros', this.currentSessionId), {
              salida: new Date()
            });
            this.currentSessionId = null;
            // La salida se registró correctamente.
          } catch (error) {
            // TODO: Implementar un sistema de reintentos o una cola offline.
            console.error('Error al registrar salida en Firebase:', error);
          }
        } else {
        }
      }
    });
  }
}