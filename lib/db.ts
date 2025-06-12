import { db as firebaseDb } from "@/lib/firebase-admin"

// Export the Firestore database instance
export const db = firebaseDb

// Re-export for compatibility
export default firebaseDb
