import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface KioskPayload {
  raw: string;
  parsed?: any;
}

@Injectable({ providedIn: 'root' })
export class KioskService {
  // Holds the currently-logged student id (as read from QR) for quick display
  private _studentId = new BehaviorSubject<string | null>(null);
  readonly student$ = this._studentId.asObservable();

  // Holds the last scanned payload (raw + optionally parsed JSON)
  private _lastPayload = new BehaviorSubject<KioskPayload | null>(null);
  readonly lastPayload$ = this._lastPayload.asObservable();

  enableKioskMode = true; // toggle to enforce kiosk-only navigation

  constructor() {}

  loginWithQr(payload: string) {
    // First, try JSON payload
    let parsed: any = undefined;
    try {
      parsed = JSON.parse(payload);
    } catch (e) {
      // Not JSON — try specific kiosk format: <10-digit-cedula>#<DDMMYYYY>
      const re = /^(\d{10})#(\d{8})$/;
      const m = payload.match(re);
      if (m) {
        const cedula = m[1];
        const dateStr = m[2]; // DDMMYYYY
        const day = parseInt(dateStr.slice(0, 2), 10);
        const month = parseInt(dateStr.slice(2, 4), 10);
        const year = parseInt(dateStr.slice(4, 8), 10);
        // Basic date validation
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

    // Derive student id: prefer parsed cedula or common id keys from JSON, else raw
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
  }

  logout() {
    this._studentId.next(null);
    this._lastPayload.next(null);
  }
}
