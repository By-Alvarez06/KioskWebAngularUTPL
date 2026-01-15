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

async function checkStudents() {
  console.log('🔍 Verificando documentos en colección "estudiantes"...\n');

  try {
    const estudiantesSnap = await getDocs(collection(firestore, 'estudiantes'));
    console.log(`📊 Total de documentos: ${estudiantesSnap.size}\n`);

    estudiantesSnap.forEach(doc => {
      const data = doc.data();
      console.log(`ID: ${doc.id}`);
      console.log(`  Nombres: ${data['nombres'] || '⚠️  SIN NOMBRES'}`);
      console.log(`  Apellidos: ${data['apellidos'] || '⚠️  SIN APELLIDOS'}`);
      console.log(`  Otros campos: ${Object.keys(data).filter(k => k !== 'nombres' && k !== 'apellidos').join(', ') || 'ninguno'}`);
      console.log();
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkStudents();
