// src/app/firebase/core.ts

import { Injectable } from '@angular/core';
import { initializeApp, FirebaseApp, getApp } from 'firebase/app';
import { getAuth, Auth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

// ESTA ES LA LÍNEA CRÍTICA: Cambia solo la carpeta 'firebase' a la carpeta 'environments'
import { firebaseConfig } from '../environments/environment.firebase'; 


@Injectable({
  providedIn: 'root'
})
export class CoreFirebaseService {
  private static initialized = false;
  private app: FirebaseApp;
  public auth: Auth;
  public firestore: Firestore;

  constructor() {
    if (!CoreFirebaseService.initialized) {
      CoreFirebaseService.initialized = true;
      // 1. Inicializar la aplicación de Firebase
      this.app = initializeApp(firebaseConfig);
      
      // 2. Obtener las instancias de los servicios
      this.auth = getAuth(this.app);
      this.firestore = getFirestore(this.app);
      
      console.log('Firebase App Inicializada y servicios disponibles.');
      
      // 3. Autenticación anónima automática
      this.initAnonymousAuth();
    } else {
      // Reusar la app existente si ya está inicializada
      this.app = getApp();
      this.auth = getAuth(this.app);
      this.firestore = getFirestore(this.app);
    }
  }

  private async initAnonymousAuth() {
    try {
      // Verificar si ya hay un usuario autenticado
      onAuthStateChanged(this.auth, async (user) => {
        if (user) {
          console.log('✅ Usuario autenticado:', user.isAnonymous ? 'Anónimo' : user.uid);
        } else {
          console.log('⏳ Autenticando anónimamente...');
          const result = await signInAnonymously(this.auth);
          console.log('✅ Autenticación anónima exitosa:', result.user.uid);
        }
      });
    } catch (error) {
      console.error('❌ Error en autenticación anónima:', error);
    }
  }