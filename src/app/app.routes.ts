import { Routes } from '@angular/router';
import { KioskComponent } from './kiosk/kiosk.component';
import { kioskGuard } from './kiosk/kiosk.guard';

export const routes: Routes = [
	// Default route to kiosk screen (restricted environment)
	{ path: '', component: KioskComponent, canActivate: [kioskGuard] },
	// Any unknown route -> redirect to kiosk
	{ path: '**', redirectTo: '' },
];
