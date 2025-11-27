import { promises as fs } from 'fs';
import path from 'path';

const config = `
const firebaseConfig = {
  apiKey: "${process.env.VITE_FIREBASE_API_KEY}",
  authDomain: "${process.env.VITE_FIREBASE_AUTH_DOMAIN}",
  projectId: "${process.env.VITE_FIREBASE_PROJECT_ID}",
  messagingSenderId: "${process.env.VITE_FIREBASE_MESSAGING_SENDER_ID}",
  appId: "${process.env.VITE_FIREBASE_APP_ID}",
  measurementId: "${process.env.VITE_FIREBASE_MEASUREMENT_ID}"
};
`;

const targetPath = path.join(process.cwd(), 'public', 'firebase-config.js');

async function createConfig() {
  try {
    await fs.writeFile(targetPath, config);
    console.log('Successfully created firebase-config.js');
  } catch (err) {
    console.error('Error creating firebase-config.js:', err);
    process.exit(1); // Exit with an error code
  }
}

createConfig();
