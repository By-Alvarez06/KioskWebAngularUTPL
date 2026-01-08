import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { collection, addDoc, updateDoc, doc, Timestamp, query, where, orderBy, limit, getDocs, getDoc } from 'firebase/firestore';
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
  totalHoras?: string; // duración expresada como "Hh Mm Ss" para lectura
  actividades?: string[];
  estadoSesion?: 'activa' | 'cerrada' | 'caducada';
  cerradaAutomaticamente?: boolean;
  motivoCierre?: string;
}

@Injectable({ providedIn: 'root' })
export class KioskService {
  // Holds the currently-logged student id (as read from QR) for quick display
  private _studentId = new BehaviorSubject<string | null>(null);
  readonly student$ = this._studentId.asObservable();

  // Guarda el nombre completo del estudiante (si está disponible)
  private _studentName = new BehaviorSubject<string | null>(null);
  readonly studentName$ = this._studentName.asObservable();

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
  private readonly MAX_SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 horas
  private readonly MIN_SESSION_DURATION_MS = 5 * 60 * 1000; // 5 minutos

  constructor(private firebaseCore: CoreFirebaseService) {}

  setSaveStatus(status: 'idle' | 'saving' | 'success' | 'error', errorMsg: string | null = null) {
    this._saveStatus.next(status);
    this._saveError.next(errorMsg);
  }

  async loginWithQr(payload: string) {
    console.log('Kiosk Service loginWithQr called with:', payload);
    
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
        const pad = (n: number) => String(n).padStart(2, '0');
        parsed = {
          cedula,
          dateRaw: dateStr,
          // Usar fecha local para evitar desfasajes por zona horaria
          dateISO: validDate ? `${year}-${pad(month)}-${pad(day)}` : null,
          dateDisplay: validDate ? `${pad(day)}/${pad(month)}/${year}` : 'Fecha inválida',
          format: 'CEDULA10#DDMMYYYY',
        };
      }
    }

    this._lastPayload.next({ raw: payload, parsed });

    // VALIDACIÓN: Rechazar QR expirado (fecha en QR debe ser hoy)
    if (parsed && parsed.dateISO) {
      const today = (() => {
        const now = new Date();
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      })();
      if (parsed.dateISO !== today) {
        const errorMsg = `QR expirado. Fecha QR: ${parsed.dateDisplay}, Hoy: ${today}`;
        console.warn(errorMsg);
        this._registroMensaje.next(errorMsg);
        setTimeout(() => this._registroMensaje.next(''), 4000);
        return; // Rechazar procesamiento
      }
    }

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
    
    // Consultar el nombre del estudiante
    const studentName = await this.getStudentName(id);
    this._studentName.next(studentName);

    // Consultar Firebase para ver si hay una sesión activa para este estudiante
    const activeSession = await this.checkActiveSession(id);

    if (activeSession) {
      // Detectar si la sesión activa supera 24h sin salida
      const entradaDate = activeSession.data.horaEntrada?.toDate
        ? activeSession.data.horaEntrada.toDate()
        : new Date(activeSession.data.horaEntrada);
      const now = new Date();
      const elapsedMs = now.getTime() - entradaDate.getTime();

      if (elapsedMs > this.MAX_SESSION_DURATION_MS) {
        // Cerrar automáticamente como 'caducada' y no contar horas
        await this.closeStaleSession(activeSession.id, entradaDate);
        this._registroMensaje.next('Sesión anterior caducada por superar 24h');
        this._showActivitiesInput.next(false);
        // Continuar con nuevo check-in abajo
      } else {
        // Sesión activa normal: solicitar actividades para cierre
        this.previousCheckInId = activeSession.id;
        this.previousCheckInTime = entradaDate;
        this._showActivitiesInput.next(true);
        return;
      }
    }

    this._studentId.next(id);
    const checkInTime = new Date();
    this._checkInTime.next(checkInTime);
    this.previousCheckInTime = checkInTime; // Guardar para calcular duración después
    
    // Mensaje de entrada registrada
    this._registroMensaje.next(studentName ? `Bienvenido: ${studentName}`: 'Entrada registrada');
    this._showActivitiesInput.next(false); // Asegurar que se oculte el form si alguien escanea entrada
    setTimeout(() => this._registroMensaje.next(''), 3000);

    // Guardar en Firebase
    await this.saveCheckIn(id, checkInTime, payload, parsed?.cedula);
  }

  // Metodo para verificar si hay una sesión activa (sin hora de salida) y registrar salida
  private async checkActiveSession(studentId: string): Promise<{ id: string, data: any } | null> {
    try {
      const attendanceRef = collection(this.firebaseCore.firestore, 'registroAsistencia');
      // Buscar el último registro de este estudiante
      const q = query(
        attendanceRef,
        where('idEstudiante', '==', studentId),
        orderBy('horaEntrada', 'desc'),
        limit(1)
      );

      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const docSnap = querySnapshot.docs[0];
        const data = docSnap.data();
        // Si no tiene hora de salida, es una sesión activa
        if (!data['horaSalida']) {
          return { id: docSnap.id, data };
        }
      }
      return null;
    } catch (error) {
      console.error('Error verificando sesión activa:', error);
      return null;
    }
  }

  private formatearDuracion(duracionMs: number): string {
    const segundos = Math.floor(duracionMs / 1000);
    const minutos = Math.floor(segundos / 60);
    const horas = Math.floor(minutos / 60);
    
    const segsRestantes = segundos % 60;
    const minsRestantes = minutos % 60;
    
    return `${horas}h ${minsRestantes}m ${segsRestantes}s`;
  }

  // Convierte una cadena "Hh Mm Ss" a milisegundos
  private parseDuracionAms(valor: string): number {
    if (!valor || typeof valor !== 'string') return 0;
    const regex = /(?:(\d+)h)?\s*(?:(\d+)m)?\s*(?:(\d+)s)?/i;
    const m = valor.match(regex);
    if (!m) return 0;
    const h = parseInt(m[1] || '0', 10);
    const min = parseInt(m[2] || '0', 10);
    const s = parseInt(m[3] || '0', 10);
    return ((h * 60 + min) * 60 + s) * 1000;
  }

  // Nuevo método para finalizar la salida con actividades
  async submitActivities(activities: string[]) {
    // VALIDACIÓN: Actividades obligatorias (al menos una no vacía)
    const validActivities = activities.filter(a => a && a.trim().length > 0);
    if (validActivities.length === 0) {
      const errorMsg = 'Error: Debes ingresar al menos una actividad realizada.';
      this._registroMensaje.next(errorMsg);
      setTimeout(() => this._registroMensaje.next(''), 2000);
      console.warn(errorMsg);
      return; // Rechazar cierre
    }

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

  // Nuevo método para obtener el nombre del estudiante desde Firestore
  async getStudentName(studentId: string): Promise<string | null> {
    try {
      const studentDocRef = doc(this.firebaseCore.firestore, 'estudiantes', studentId);
      const docSnap = await getDoc(studentDocRef);

      if (docSnap.exists()) {
        const studentData = docSnap.data();
        const nombres = studentData['nombres'] || '';
        const apellidos = studentData['apellidos'] || '';
        const fullName = `${nombres} ${apellidos}`.trim();
        return fullName || null;
      } else {
        console.warn(`No se encontró estudiante con ID (cédula): ${studentId}`);
        return null;
      }
    } catch (error) {
      console.error('Error buscando estudiante por ID:', error);
      return null;
    }
  }

  private async saveCheckIn(studentId: string, checkInTime: Date, qrCode: string, cedula?: string) {
    try {
      this._saveStatus.next('saving');
      
      const checkInRecord: CheckInRecord = {
        idEstudiante: studentId,
        cedula: cedula || '',
        horaEntrada: checkInTime,
        codigoQR: qrCode,
        totalHoras: '0h 0m 0s',
        estadoSesion: 'activa'
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

      // Calcular total de horas realizadas entre horaEntrada y horaSalida
      let totalHoras = '0h 0m 0s';
      let motivoCierre: string | null = null;
      let duracionMs = 0;
      if (this.previousCheckInTime) {
        duracionMs = checkOutTime.getTime() - this.previousCheckInTime.getTime();
        const duracionTexto = this.formatearDuracion(duracionMs);
        const isTooShort = duracionMs > 0 && duracionMs < this.MIN_SESSION_DURATION_MS;
        totalHoras = isTooShort ? '0h 0m 0s' : duracionTexto;
        motivoCierre = isTooShort ? 'duracion menor al mínimo (5m)' : null;
        this._duracionSesion.next(duracionTexto); // mostrar en UI (valor real medido)
      }

      // Obtener idEstudiante desde el registro (garantiza consistencia)
      let idEstudiante: string | null = null;
      try {
        const checkInSnap = await getDoc(docRef);
        if (checkInSnap.exists()) {
          const data = checkInSnap.data();
          idEstudiante = (data['idEstudiante'] as string) || null;
        }
      } catch (e) {
        console.warn('No se pudo leer el registro para obtener idEstudiante:', e);
      }

      await updateDoc(docRef, {
        horaSalida: checkOutTime,
        actividades: validActivities,
        totalHoras: totalHoras,
        estadoSesion: 'cerrada',
        cerradaAutomaticamente: false,
        ...(motivoCierre ? { motivoCierre } : {})
      });

      // Acumular horas en estudiantes.totalHoras (Hh Mm Ss)
      if (idEstudiante && duracionMs >= this.MIN_SESSION_DURATION_MS) {
        try {
          const studentRef = doc(this.firebaseCore.firestore, 'estudiantes', idEstudiante);
          const studentSnap = await getDoc(studentRef);
          const actualStr = studentSnap.exists() ? (studentSnap.data()['totalHoras'] as string) || '0h 0m 0s' : '0h 0m 0s';
          const actualMs = this.parseDuracionAms(actualStr);
          const nuevoMs = actualMs + duracionMs;
          const nuevoStr = this.formatearDuracion(nuevoMs);
          await updateDoc(studentRef, { totalHoras: nuevoStr });
        } catch (e) {
          console.warn('No se pudo acumular horas en estudiantes.totalHoras:', e);
        }
      }
      
      console.log('✅ Salida registrada para:', this.previousCheckInId);
      this.previousCheckInId = null; // Limpiar ID
      this.previousCheckInTime = null;
    } catch (error: any) {
      console.error('Error guardando salida:', error);
    }
  }

  // Cerrar sesión caducada (>24h) automáticamente y no contar horas
  private async closeStaleSession(docId: string, entradaDate: Date) {
    try {
      const docRef = doc(this.firebaseCore.firestore, 'registroAsistencia', docId);
      await updateDoc(docRef, {
        horaSalida: new Date(),
        actividades: [],
        totalHoras: 0,
        estadoSesion: 'caducada',
        cerradaAutomaticamente: true,
        motivoCierre: 'superó 24h sin salida'
      });
      console.log('⚠️ Sesión caducada auto-cerrada:', docId);
    } catch (error) {
      console.error('Error cerrando sesión caducada:', error);
    }
  }

  logout() {
    this._studentId.next(null);
    this._studentName.next(null); // Limpiar el nombre del estudiante
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
