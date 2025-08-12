import { doc, setDoc, getDoc, updateDoc, increment, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"

export interface FreeUserLimits {
  downloadsUsed: number
  downloadsLimit: number
  bundlesCreated: number
  bundlesLimit: number
  createdAt: any
  updatedAt: any
}

export class FreeUsersService {
  private static readonly COLLECTION = "freeUsers"
  private static readonly DEFAULT_DOWNLOAD_LIMIT = 5
  private static readonly DEFAULT_BUNDLE_LIMIT = 2

  static async createFreeUser(uid: string): Promise<void> {
    if (!db) throw new Error("Firestore not initialized")

    const userRef = doc(db, this.COLLECTION, uid)

    // Check if user already exists
    const existingUser = await getDoc(userRef)
    if (existingUser.exists()) {
      console.log("Free user already exists:", uid)
      return
    }

    const freeUserData: FreeUserLimits = {
      downloadsUsed: 0,
      downloadsLimit: this.DEFAULT_DOWNLOAD_LIMIT,
      bundlesCreated: 0,
      bundlesLimit: this.DEFAULT_BUNDLE_LIMIT,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }

    await setDoc(userRef, freeUserData)
    console.log("Created free user:", uid)
  }

  static async getFreeUserLimits(uid: string): Promise<FreeUserLimits | null> {
    if (!db) return null

    const userRef = doc(db, this.COLLECTION, uid)
    const userDoc = await getDoc(userRef)

    if (!userDoc.exists()) {
      return null
    }

    return userDoc.data() as FreeUserLimits
  }

  static async incrementDownload(uid: string): Promise<boolean> {
    if (!db) return false

    const userRef = doc(db, this.COLLECTION, uid)
    const userDoc = await getDoc(userRef)

    if (!userDoc.exists()) {
      console.error("Free user not found:", uid)
      return false
    }

    const userData = userDoc.data() as FreeUserLimits

    if (userData.downloadsUsed >= userData.downloadsLimit) {
      console.log("Download limit reached for user:", uid)
      return false
    }

    await updateDoc(userRef, {
      downloadsUsed: increment(1),
      updatedAt: serverTimestamp(),
    })

    return true
  }

  static async incrementBundle(uid: string): Promise<boolean> {
    if (!db) return false

    const userRef = doc(db, this.COLLECTION, uid)
    const userDoc = await getDoc(userRef)

    if (!userDoc.exists()) {
      console.error("Free user not found:", uid)
      return false
    }

    const userData = userDoc.data() as FreeUserLimits

    if (userData.bundlesCreated >= userData.bundlesLimit) {
      console.log("Bundle limit reached for user:", uid)
      return false
    }

    await updateDoc(userRef, {
      bundlesCreated: increment(1),
      updatedAt: serverTimestamp(),
    })

    return true
  }

  static async resetLimits(uid: string): Promise<void> {
    if (!db) return

    const userRef = doc(db, this.COLLECTION, uid)
    await updateDoc(userRef, {
      downloadsUsed: 0,
      bundlesCreated: 0,
      updatedAt: serverTimestamp(),
    })
  }
}

// Named exports for compatibility
export async function createFreeUser(uid: string): Promise<void> {
  return FreeUsersService.createFreeUser(uid)
}

export async function getFreeUserLimits(uid: string): Promise<FreeUserLimits | null> {
  return FreeUsersService.getFreeUserLimits(uid)
}

export async function incrementDownload(uid: string): Promise<boolean> {
  return FreeUsersService.incrementDownload(uid)
}

export async function incrementBundle(uid: string): Promise<boolean> {
  return FreeUsersService.incrementBundle(uid)
}

export async function resetLimits(uid: string): Promise<void> {
  return FreeUsersService.resetLimits(uid)
}
