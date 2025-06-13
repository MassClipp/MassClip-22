import { getFirestore } from "firebase/firestore"

// Initialize Firestore
const db = getFirestore(app)

// Export db for compatibility
export { db }
