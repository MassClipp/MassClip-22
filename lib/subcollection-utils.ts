import { collection, doc, setDoc, getDocs, query, limit } from "firebase/firestore"
import { db } from "@/lib/firebase"

/**
 * Ensures that a subcollection exists by creating a placeholder document if needed
 * @param userId The user ID
 * @param subcollectionName The name of the subcollection to ensure
 * @returns A promise that resolves to true if the subcollection exists or was created
 */
export async function ensureSubcollectionExists(userId: string, subcollectionName: string): Promise<boolean> {
  try {
    console.log(`[SubcollectionUtils] Ensuring ${subcollectionName} exists for user ${userId}`)

    // Try to read from the subcollection first
    const collectionRef = collection(db, `users/${userId}/${subcollectionName}`)
    const q = query(collectionRef, limit(1))

    const snapshot = await getDocs(q)

    // If we can read and there are documents, the subcollection exists
    if (!snapshot.empty) {
      console.log(`[SubcollectionUtils] ${subcollectionName} already exists with documents`)
      return true
    }

    // If we can read but there are no documents, create a placeholder
    console.log(`[SubcollectionUtils] Creating placeholder for ${subcollectionName}`)
    await setDoc(doc(collectionRef, "placeholder"), {
      createdAt: new Date(),
      system: true,
      message: `This document ensures the ${subcollectionName} subcollection exists`,
    })

    // Verify we can read the subcollection after creating the placeholder
    const verifyQuery = query(collectionRef, limit(1))
    await getDocs(verifyQuery)

    console.log(`[SubcollectionUtils] Successfully created and verified ${subcollectionName}`)
    return true
  } catch (error) {
    console.error(`[SubcollectionUtils] Error ensuring ${subcollectionName} exists:`, error)
    return false
  }
}

/**
 * Ensures that all required user subcollections exist
 * @param userId The user ID
 * @returns A promise that resolves to true if all subcollections exist or were created
 */
export async function ensureAllUserSubcollectionsExist(userId: string): Promise<boolean> {
  try {
    const favoritesResult = await ensureSubcollectionExists(userId, "favorites")
    const historyResult = await ensureSubcollectionExists(userId, "history")

    return favoritesResult && historyResult
  } catch (error) {
    console.error("[SubcollectionUtils] Error ensuring all subcollections exist:", error)
    return false
  }
}
