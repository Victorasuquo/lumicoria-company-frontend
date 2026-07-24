import { getApp, getApps, initializeApp } from 'firebase/app'
import {
  browserLocalPersistence,
  getAuth,
  setPersistence,
} from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const isFirebaseConfigured = Object.values(firebaseConfig).every(Boolean)

const app = isFirebaseConfigured
  ? (getApps().length ? getApp() : initializeApp(firebaseConfig))
  : null

export const portalAuth = app ? getAuth(app) : null

if (portalAuth) {
  if (import.meta.env.VITE_FIREBASE_TENANT_ID) {
    portalAuth.tenantId = import.meta.env.VITE_FIREBASE_TENANT_ID
  }
  void setPersistence(portalAuth, browserLocalPersistence)
}
