import { doc, setDoc, deleteDoc, collection, getDocs, limit, query } from "firebase/firestore"
import { db } from "@/lib/firebase"

/**
 * Initializes subcollections for a user to prevent permission errors
 * @param userId The user ID
 * @returns A promise that resolves when initialization is complete
 */
export async function initializeUserSubcollections(userId: string): Promise<boolean> {
  console.log(`[SubcollectionInitializer] Starting initialization for user: ${userId}`)

  try {
    // Check if favorites subcollection exists by trying to read from it
    const favoritesRef = collection(db, `users/${userId}/favorites`)
    const favoritesQuery = query(favoritesRef, limit(1))
    const favoritesSnapshot = await getDocs(favoritesQuery)

    // If favorites subcollection doesn't exist or is empty, initialize it
    if (favoritesSnapshot.empty) {
      console.log(`[SubcollectionInitializer] Initializing favorites subcollection for user: ${userId}`)
      const tempFavDoc = doc(favoritesRef, "__temp__")
      await setDoc(tempFavDoc, {
        createdAt: new Date(),
        temporary: true,
      })
      await deleteDoc(tempFavDoc)
    }

    // Check if history subcollection exists by trying to read from it
    const historyRef = collection(db, `users/${userId}/history`)
    const historyQuery = query(historyRef, limit(1))
    const historySnapshot = await getDocs(historyQuery)

    // If history subcollection doesn't exist or is empty, initialize it
    if (historySnapshot.empty) {
      console.log(`[SubcollectionInitializer] Initializing history subcollection for user: ${userId}`)
      const tempHistDoc = doc(historyRef, "__temp__")
      await setDoc(tempHistDoc, {
        createdAt: new Date(),
        temporary: true,
      })
      await deleteDoc(tempHistDoc)
    }

    console.log(`[SubcollectionInitializer] Initialization complete for user: ${userId}`)
    return true
  } catch (error) {
    console.error(`[SubcollectionInitializer] Error initializing subcollections:`, error)
    return false
  }
}

/**
 * Checks if a subcollection exists and is accessible
 * @param userId The user ID
 * @param subcollectionName The name of the subcollection
 * @returns A promise that resolves to true if the subcollection exists and is accessible
 */
export async function checkSubcollectionAccess(userId: string, subcollectionName: string): Promise<boolean> {
  try {
    const subcollectionRef = collection(db, `users/${userId}/${subcollectionName}`)
    const q = query(subcollectionRef, limit(1))
    await getDocs(q)
    return true
  } catch (error) {
    console.error(`[SubcollectionInitializer] Error accessing ${subcollectionName}:`, error)
    return false
  }
}
