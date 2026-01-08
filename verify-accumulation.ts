// Script para verificar si la acumulación de horas se está haciendo correctamente en Firestore

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBwY-s8_pUd7Pxc5CQOihGAM1VZNRlLCaQ",
  authDomain: "implement-qr.firebaseapp.com",
  projectId: "implement-qr",
  storageBucket: "implement-qr.firebasestorage.app",
  messagingSenderId: "1061272362492",
  appId: "1:1061272362492:web:c56d2a8322b3dfe4d6e679",
  measurementId: "G-QW0HW8ZPH1"
};

const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);

function parseDuracionAms(valor: string): number {
  if (!valor || typeof valor !== 'string') return 0;
  const regex = /(?:(\d+)h)?\s*(?:(\d+)m)?\s*(?:(\d+)s)?/i;
  const m = valor.match(regex);
  if (!m) return 0;
  const h = parseInt(m[1] || '0', 10);
  const min = parseInt(m[2] || '0', 10);
  const s = parseInt(m[3] || '0', 10);
  return ((h * 60 + min) * 60 + s) * 1000;
}

function formatearDuracion(duracionMs: number): string {
  const segundos = Math.floor(duracionMs / 1000);
  const minutos = Math.floor(segundos / 60);
  const horas = Math.floor(minutos / 60);
  
  const segsRestantes = segundos % 60;
  const minsRestantes = minutos % 60;
  
  return `${horas}h ${minsRestantes}m ${segsRestantes}s`;
}

async function verificarAcumulacion() {
  console.log('🔍 Verificando acumulación de horas en Firestore...\n');

  try {
    // 1. Obtener todos los estudiantes
    const estudiantesSnap = await getDocs(collection(firestore, 'estudiantes'));
    console.log(`📊 Total de estudiantes: ${estudiantesSnap.size}\n`);

    // 2. Para cada estudiante, verificar sus sesiones cerradas
    for (const estudianteDoc of estudiantesSnap.docs) {
      const estudianteId = estudianteDoc.id;
      const estudianteData = estudianteDoc.data();
      const totalHorasRegistrado = estudianteData['totalHoras'] || '0h 0m 0s';

      // Obtener todas las sesiones cerradas de este estudiante
      const registrosSnap = await getDocs(
        collection(firestore, 'registroAsistencia')
      );

      const sesionesEstudiante = registrosSnap.docs.filter(doc => {
        const data = doc.data();
        return data['idEstudiante'] === estudianteId && 
               data['estadoSesion'] === 'cerrada' &&
               data['totalHoras'] !== '0h 0m 0s'; // Sesiones válidas (>= 5 min)
      });

      // Calcular suma esperada
      let sumaMs = 0;
      sesionesEstudiante.forEach(sesionDoc => {
        const data = sesionDoc.data();
        const duracionStr = data['totalHoras'] as string;
        sumaMs += parseDuracionAms(duracionStr);
      });
      const sumaEsperada = formatearDuracion(sumaMs);

      // Comparar
      const coincide = totalHorasRegistrado === sumaEsperada;
      const icono = coincide ? '✅' : '❌';

      if (sesionesEstudiante.length > 0) {
        console.log(`${icono} Estudiante: ${estudianteId}`);
        console.log(`   Nombre: ${estudianteData['nombres']} ${estudianteData['apellidos']}`);
        console.log(`   Sesiones cerradas (válidas): ${sesionesEstudiante.length}`);
        console.log(`   Total registrado: ${totalHorasRegistrado}`);
        console.log(`   Total esperado (suma sesiones): ${sumaEsperada}`);
        if (!coincide) {
          console.log(`   ⚠️  DISCREPANCIA DETECTADA`);
          // Listar sesiones
          sesionesEstudiante.forEach((sesionDoc, idx) => {
            const data = sesionDoc.data();
            console.log(`      Sesión ${idx + 1}: ${data['totalHoras']} (entrada: ${data['horaEntrada']?.toDate?.()})`);
          });
        }
        console.log();
      }
    }

    console.log('✅ Verificación completada.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error durante la verificación:', error);
    process.exit(1);
  }
}

verificarAcumulacion();
