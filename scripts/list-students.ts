import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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

async function listAllStudents() {
  console.log('📋 Listando todas las cédulas en colección "estudiantes"...\n');

  try {
    const estudiantesSnap = await getDocs(collection(firestore, 'estudiantes'));
    console.log(`📊 Total de cédulas: ${estudiantesSnap.size}\n`);

    const cedulas: any[] = [];
    estudiantesSnap.forEach(doc => {
      const data = doc.data();
      cedulas.push({
        cedula: doc.id,
        nombres: data['nombres'] || '⚠️ SIN NOMBRES',
        apellidos: data['apellidos'] || '⚠️ SIN APELLIDOS',
        estado: data['estado'] || 'N/A',
        totalHoras: data['totalHoras'] || '0h 00m 00s'
      });
    });

    // Ordenar por cédula
    cedulas.sort((a, b) => a.cedula.localeCompare(b.cedula));

    // Mostrar tabla
    console.table(cedulas);

    console.log('\n✅ Listado completo. Verifica:');
    console.log('   - ¿Existen todas las cédulas que ingresaste?');
    console.log('   - ¿Tienen nombres y apellidos completos?');
    console.log('   - ¿El ID del documento es exactamente la cédula sin espacios?');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    console.error('\n⚠️ NOTA: Si ves "Missing or insufficient permissions", actualiza las reglas de Firestore:');
    console.error('   1. Ve a Firebase Console → Firestore Database → Rules');
    console.error('   2. Reemplaza con:');
    console.error(`
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /estudiantes/{document=**} {
      allow read;
    }
    match /registroAsistencia/{document=**} {
      allow read, write;
    }
  }
}`);
    console.error('   3. Publish y vuelve a intentar');
    process.exit(1);
  }
}

listAllStudents();
