import { promises as fs } from 'fs';
import path from 'path';

const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
  'VITE_FIREBASE_MEASUREMENT_ID'
];

for (const varName of requiredEnvVars) {
  if (!process.env[varName]) {
    console.error(`Error: Missing required environment variable "${varName}".`);
    process.exit(1); // Exit with an error code to fail the build
  }
}

const config = `
const firebaseConfig = {
  apiKey: "${process.env.VITE_FIREBASE_API_KEY}",
  authDomain: "${process.env.VITE_FIREBASE_AUTH_DOMAIN}",
  projectId: "${process.env.VITE_FIREBASE_PROJECT_ID}",
  storageBucket: "${process.env.VITE_FIREBASE_STORAGE_BUCKET}",
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
