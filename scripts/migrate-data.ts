// Script de migración para convertir datos decimales a HMS y acumular horas correctamente

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, writeBatch } from 'firebase/firestore';

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

function convertDecimalToHms(decimal: number): string {
  const totalSegundos = Math.round(decimal * 3600); // convertir horas decimales a segundos
  return formatearDuracion(totalSegundos * 1000);
}

async function migrateData() {
  console.log('🔄 Iniciando migración de datos...\n');

  try {
    // PASO 1: Convertir registros con formato decimal a HMS
    console.log('📝 PASO 1: Convertiendo formatos decimales a HMS...\n');
    
    const registrosSnap = await getDocs(collection(firestore, 'registroAsistencia'));
    const batch = writeBatch(firestore);
    let actualizados = 0;

    for (const regDoc of registrosSnap.docs) {
      const data = regDoc.data();
      const totalHoras = data['totalHoras'];
      
      // Si es un número (decimal) o un string con solo números, convertir
      if (typeof totalHoras === 'number' || (typeof totalHoras === 'string' && /^\d+\.?\d*$/.test(totalHoras))) {
        const decimal = typeof totalHoras === 'number' ? totalHoras : parseFloat(totalHoras as string);
        const hmsFormato = convertDecimalToHms(decimal);
        
        console.log(`  Registro ${regDoc.id}: ${totalHoras} → ${hmsFormato}`);
        batch.update(doc(firestore, 'registroAsistencia', regDoc.id), {
          totalHoras: hmsFormato
        });
        actualizados++;
      }
    }

    await batch.commit();
    console.log(`\n✅ ${actualizados} registros convertidos a HMS\n`);

    // PASO 2: Acumular horas en estudiantes
    console.log('📊 PASO 2: Acumulando horas en estudiantes...\n');

    const estudiantesSnap = await getDocs(collection(firestore, 'estudiantes'));
    const estudiantesBatch = writeBatch(firestore);
    let actualizadosEstudiantes = 0;

    for (const estudianteDoc of estudiantesSnap.docs) {
      const estudianteId = estudianteDoc.id;
      const estudianteData = estudianteDoc.data();

      // Obtener todas las sesiones cerradas válidas de este estudiante
      const registrosEstudianteSnap = await getDocs(collection(firestore, 'registroAsistencia'));
      
      let sumaMs = 0;
      let sesionesValidas = 0;

      for (const regDoc of registrosEstudianteSnap.docs) {
        const data = regDoc.data();
        if (data['idEstudiante'] === estudianteId && 
            data['estadoSesion'] === 'cerrada' &&
            data['totalHoras'] !== '0h 0m 0s') {
          
          const duracionMs = parseDuracionAms(data['totalHoras'] as string);
          if (duracionMs > 0) {
            sumaMs += duracionMs;
            sesionesValidas++;
          }
        }
      }

      const totalHorasFormato = formatearDuracion(sumaMs);
      
      if (sesionesValidas > 0 || sumaMs > 0) {
        console.log(`  Estudiante ${estudianteId} (${estudianteData['nombres']} ${estudianteData['apellidos']})`);
        console.log(`    Sesiones válidas: ${sesionesValidas}`);
        console.log(`    Total acumulado: ${totalHorasFormato}`);
        
        estudiantesBatch.update(doc(firestore, 'estudiantes', estudianteId), {
          totalHoras: totalHorasFormato
        });
        actualizadosEstudiantes++;
      }
    }

    await estudiantesBatch.commit();
    console.log(`\n✅ ${actualizadosEstudiantes} estudiantes actualizados con totales acumulados\n`);

    console.log('✅ Migración completada exitosamente.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    process.exit(1);
  }
}

migrateData();
