// Re-export from firebase.ts to fix import issues
import { app, auth, db, storage, isFirebaseConfigured, initializeFirebaseApp } from "./firebase"

export { app, auth, db, storage, isFirebaseConfigured, initializeFirebaseApp }
