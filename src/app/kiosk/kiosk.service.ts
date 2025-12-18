import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { collection, addDoc, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { CoreFirebaseService } from '../firebase/core';

export interface KioskPayload {
  raw: string;
  parsed?: any;
}

export interface CheckInRecord {
  id?: string;
  idEstudiante: string;
  cedula?: string;
  horaEntrada: Date;
  horaSalida?: Date;
  codigoQR: string;
  marcaTiempo?: Timestamp;
  marcaTiempoSalida?: Timestamp;
  actividades?: string[];
}

@Injectable({ providedIn: 'root' })
export class KioskService {
  // Holds the currently-logged student id (as read from QR) for quick display
  private _studentId = new BehaviorSubject<string | null>(null);
  readonly student$ = this._studentId.asObservable();

  // Holds the last scanned payload (raw + optionally parsed JSON)
  private _lastPayload = new BehaviorSubject<KioskPayload | null>(null);
  readonly lastPayload$ = this._lastPayload.asObservable();

  // Hora de check-in actual
  private _checkInTime = new BehaviorSubject<Date | null>(null);
  readonly checkInTime$ = this._checkInTime.asObservable();

  // Mensaje de estado (entrada/salida)
  private _registroMensaje = new BehaviorSubject<string>('');
  readonly registroMensaje$ = this._registroMensaje.asObservable();

  // Duración de la sesión
  private _duracionSesion = new BehaviorSubject<string>('');
  readonly duracionSesion$ = this._duracionSesion.asObservable();

  // Save status for UI feedback
  private _saveStatus = new BehaviorSubject<'idle' | 'saving' | 'success' | 'error'>('idle');
  readonly saveStatus$ = this._saveStatus.asObservable();
  private _saveError = new BehaviorSubject<string | null>(null);
  readonly saveError$ = this._saveError.asObservable();

  // Controlar visibilidad del input de actividades
  private _showActivitiesInput = new BehaviorSubject<boolean>(false);
  readonly showActivitiesInput$ = this._showActivitiesInput.asObservable();

  enableKioskMode = true;
  private previousCheckInId: string | null = null; // Para guardar el ID del registro anterior
  private previousCheckInTime: Date | null = null; // Guardar hora de entrada para calcular duración

  constructor(private firebaseCore: CoreFirebaseService) {}

  setSaveStatus(status: 'idle' | 'saving' | 'success' | 'error', errorMsg: string | null = null) {
    this._saveStatus.next(status);
    this._saveError.next(errorMsg);
  }

  async loginWithQr(payload: string) {
    console.log('Kiosk Service loginWithQr called with:', payload);
    
    // Verificar si es el mismo código (salida)
    const ultimoPayload = this._lastPayload.value?.raw;
    const esRegistroSalida = ultimoPayload === payload && this.previousCheckInId;

    if (esRegistroSalida) {
      // DETECTADA SALIDA: En lugar de cerrar inmediatamente, mostramos el input de actividades
      this._showActivitiesInput.next(true);
      return;
    }

    // Primero, cerrar la sesión anterior si existe
    if (this.previousCheckInId) {
      await this.closeCheckOut();
    }

    // Parsear el QR
    let parsed: any = undefined;
    try {
      parsed = JSON.parse(payload);
    } catch (e) {
      // Not JSON — try specific kiosk format: <10-digit-cedula>#<DDMMYYYY>
      const re = /^(\d{10})#(\d{8})$/;
      const m = payload.match(re);
      if (m) {
        const cedula = m[1];
        const dateStr = m[2];
        const day = parseInt(dateStr.slice(0, 2), 10);
        const month = parseInt(dateStr.slice(2, 4), 10);
        const year = parseInt(dateStr.slice(4, 8), 10);
        const dateObj = new Date(year, month - 1, day);
        const validDate = dateObj && dateObj.getFullYear() === year && dateObj.getMonth() === month - 1 && dateObj.getDate() === day;
        parsed = {
          cedula,
          dateRaw: dateStr,
          dateISO: validDate ? dateObj.toISOString().slice(0, 10) : null,
          dateDisplay: validDate ? `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${String(year)}` : 'Fecha inválida',
          format: 'CEDULA10#DDMMYYYY',
        };
      }
    }

    this._lastPayload.next({ raw: payload, parsed });

    // Derivar student id
    let id: string | null = null;
    if (parsed) {
      if (parsed.cedula) {
        id = parsed.cedula;
      } else if (parsed.id || parsed.studentId || parsed.student_id) {
        id = parsed.id || parsed.studentId || parsed.student_id;
      }
    }
    if (!id) id = payload;
    
    this._studentId.next(id);
    const checkInTime = new Date();
    this._checkInTime.next(checkInTime);
    this.previousCheckInTime = checkInTime; // Guardar para calcular duración después
    
    // Mensaje de entrada registrada
    this._registroMensaje.next('Entrada registrada');
    this._showActivitiesInput.next(false); // Asegurar que se oculte el form si alguien escanea entrada
    setTimeout(() => this._registroMensaje.next(''), 3000);

    // Guardar en Firebase
    await this.saveCheckIn(id, checkInTime, payload, parsed?.cedula);
  }

  private formatearDuracion(duracionMs: number): string {
    const segundos = Math.floor(duracionMs / 1000);
    const minutos = Math.floor(segundos / 60);
    const horas = Math.floor(minutos / 60);
    
    const segsRestantes = segundos % 60;
    const minsRestantes = minutos % 60;
    
    if (horas > 0) {
      return `${horas}h ${minsRestantes}m ${segsRestantes}s`;
    } else if (minutos > 0) {
      return `${minutos}m ${segsRestantes}s`;
    } else {
      return `${segundos}s`;
    }
  }

  // Nuevo método para finalizar la salida con actividades
  async submitActivities(activities: string[]) {
    // Calcular duración de la sesión
    if (this.previousCheckInTime) {
      const duracionMs = new Date().getTime() - this.previousCheckInTime.getTime();
      const duracionTexto = this.formatearDuracion(duracionMs);
      this._duracionSesion.next(duracionTexto);
    }

    // Registrar salida con actividades
    await this.closeCheckOut(activities);
    
    this._registroMensaje.next('Salida registrada');
    this._studentId.next(null);
    this._lastPayload.next(null);
    this._checkInTime.next(null);
    this._showActivitiesInput.next(false); // Ocultar formulario
    
    setTimeout(() => {
      this._registroMensaje.next('');
      this._duracionSesion.next('');
    }, 3000);
  }

  private async saveCheckIn(studentId: string, checkInTime: Date, qrCode: string, cedula?: string) {
    try {
      this._saveStatus.next('saving');
      
      const checkInRecord: CheckInRecord = {
        idEstudiante: studentId,
        cedula: cedula || '',
        horaEntrada: checkInTime,
        codigoQR: qrCode,
        marcaTiempo: Timestamp.now()
      };

      const docRef = await addDoc(collection(this.firebaseCore.firestore, 'registroAsistencia'), checkInRecord);
      this.previousCheckInId = docRef.id;
      
      console.log('✅ Entrada registrada en Firebase:', docRef.id);
      this._saveStatus.next('success');
      
      setTimeout(() => this._saveStatus.next('idle'), 2000);
    } catch (error: any) {
      console.error('Error guardando entrada:', error);
      // Fallback a localStorage
      this.saveToLocalStorage(studentId, checkInTime, cedula);
      this._saveStatus.next('error');
      this._saveError.next(error.message);
    }
  }

  private saveToLocalStorage(studentId: string, checkInTime: Date, cedula?: string) {
    try {
      const records = JSON.parse(localStorage.getItem('checkInRecords') || '[]');
      records.push({
        studentId,
        cedula,
        checkInTime: checkInTime.toISOString(),
        timestamp: new Date().toISOString()
      });
      localStorage.setItem('checkInRecords', JSON.stringify(records));
      console.log('✅ Check-in guardado en localStorage');
    } catch (e) {
      console.error('Error guardando en localStorage:', e);
    }
  }

  private async closeCheckOut(activities: string[] = []) {
    try {
      if (!this.previousCheckInId) return;
      
      const checkOutTime = new Date();
      const docRef = doc(this.firebaseCore.firestore, 'registroAsistencia', this.previousCheckInId);
      
      // Filtrar actividades vacías
      const validActivities = activities.filter(a => a && a.trim().length > 0);

      await updateDoc(docRef, {
        horaSalida: checkOutTime,
        marcaTiempoSalida: Timestamp.now(),
        actividades: validActivities
      });
      
      console.log('✅ Salida registrada para:', this.previousCheckInId);
      this.previousCheckInId = null; // Limpiar ID
      this.previousCheckInTime = null;
    } catch (error: any) {
      console.error('Error guardando salida:', error);
    }
  }

  logout() {
    this._studentId.next(null);
    this._lastPayload.next(null);
    this._checkInTime.next(null);
    this.closeCheckOut(); // Guardar check-out automáticamente
    this._showActivitiesInput.next(false);
  }

  playSuccessSound(): void {
    // Asegúrate de colocar un archivo 'success.mp3' en tu carpeta src/assets/
    // Si no existe, no fallará catastróficamente, solo logueará error en consola.
    try {
      const audio = new Audio('assets/success.mp3');
      audio.play().catch(err => console.warn('No se pudo reproducir sonido (posiblemente falta interacción del usuario o archivo):', err));
    } catch (e) {
      console.warn('Error al intentar reproducir audio:', e);
    }
  }
}
