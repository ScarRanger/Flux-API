import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';

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