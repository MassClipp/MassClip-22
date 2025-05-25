// Re-export from lib/firebase.ts to fix import issues
import { app, auth, db, storage, isFirebaseConfigured, initializeFirebaseApp } from "./lib/firebase"

export { app, auth, db, storage, isFirebaseConfigured, initializeFirebaseApp }
