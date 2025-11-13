import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { KioskService } from './kiosk.service';

export const kioskGuard: CanActivateFn = (route, state) => {
  const kiosk = inject(KioskService);
  const router = inject(Router);

  // If kiosk mode is enabled, allow navigation to kiosk routes only.
  // For now we simply allow activation — the app's routes are configured
  // to point to the kiosk UI as default. This guard is a placeholder
  // where you can implement checks (e.g. device, IP, secure token).
  if (!kiosk.enableKioskMode) {
    // If not in kiosk mode, redirect to root (which will also be kiosk)
    router.navigate(['/']);
    return false;
  }
  return true;
};
