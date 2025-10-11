import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { initializeApp as initializeClientApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// Server-side Firebase Admin configuration
const initializeFirebaseAdmin = () => {
  if (getApps().length === 0) {
    const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
    
    if (!serviceAccountBase64) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_BASE64 environment variable is not set');
    }

    try {
      // Decode base64 service account
      const serviceAccountJson = Buffer.from(serviceAccountBase64, 'base64').toString('utf-8');
      const serviceAccount = JSON.parse(serviceAccountJson);

      return initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id,
      });
    } catch (error) {
      console.error('Failed to initialize Firebase Admin:', error);
      throw new Error('Invalid Firebase service account configuration');
    }
  }
  return getApps()[0];
};

// Client-side Firebase configuration (for frontend auth)
const clientConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize client app for frontend
const clientApp = initializeClientApp(clientConfig);
export const auth = getAuth(clientApp);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Initialize admin app for backend
let adminApp: any = null;
export const getFirebaseAdmin = () => {
  if (!adminApp) {
    adminApp = initializeFirebaseAdmin();
  }
  return adminApp;
};

export const adminAuth = () => {
  return getAdminAuth(getFirebaseAdmin());
};

export default clientApp;