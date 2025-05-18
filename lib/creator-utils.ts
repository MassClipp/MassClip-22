import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore"

// Username validation
export const validateUsername = (username: string): { valid: boolean; message?: string } => {
  // Check length
  if (username.length < 3 || username.length > 20) {
    return { valid: false, message: "Username must be between 3-20 characters" }
  }

  // Check characters (lowercase letters, numbers, underscores only)
  const validPattern = /^[a-z0-9_]+$/
  if (!validPattern.test(username)) {
    return { valid: false, message: "Username can only contain lowercase letters, numbers, and underscores" }
  }

  return { valid: true }
}

// Check if username is available
export const isUsernameAvailable = async (username: string): Promise<boolean> => {
  try {
    const creatorsRef = collection(db, "creators")
    const q = query(creatorsRef, where("username", "==", username))
    const querySnapshot = await getDocs(q)

    return querySnapshot.empty
  } catch (error) {
    console.error("Error checking username availability:", error)
    throw error
  }
}

// Create or update creator profile
export const saveCreatorProfile = async (
  uid: string,
  data: {
    username: string
    displayName?: string
    bio?: string
    profilePic?: string
  },
): Promise<void> => {
  try {
    // Check if username is valid
    const validation = validateUsername(data.username)
    if (!validation.valid) {
      throw new Error(validation.message)
    }

    // Check if username is available (if it's not the user's current username)
    const creatorDoc = doc(db, "creators", uid)
    const creatorSnap = await getDoc(creatorDoc)

    if (creatorSnap.exists() && creatorSnap.data().username !== data.username) {
      const isAvailable = await isUsernameAvailable(data.username)
      if (!isAvailable) {
        throw new Error("Username is already taken")
      }
    } else if (!creatorSnap.exists()) {
      const isAvailable = await isUsernameAvailable(data.username)
      if (!isAvailable) {
        throw new Error("Username is already taken")
      }
    }

    // Save profile data
    await setDoc(
      creatorDoc,
      {
        uid,
        username: data.username,
        displayName: data.displayName || data.username,
        bio: data.bio || "",
        profilePic: data.profilePic || "",
        freeClips: [],
        paidClips: [],
        createdAt: creatorSnap.exists() ? creatorSnap.data().createdAt : serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    )
  } catch (error) {
    console.error("Error saving creator profile:", error)
    throw error
  }
}

// Get creator by username
export const getCreatorByUsername = async (username: string) => {
  try {
    const creatorsRef = collection(db, "creators")
    const q = query(creatorsRef, where("username", "==", username))
    const querySnapshot = await getDocs(q)

    if (querySnapshot.empty) {
      return null
    }

    return {
      id: querySnapshot.docs[0].id,
      ...querySnapshot.docs[0].data(),
    }
  } catch (error) {
    console.error("Error getting creator by username:", error)
    throw error
  }
}

// Get creator by uid
export const getCreatorByUid = async (uid: string) => {
  try {
    const creatorDoc = doc(db, "creators", uid)
    const creatorSnap = await getDoc(creatorDoc)

    if (!creatorSnap.exists()) {
      return null
    }

    return {
      id: creatorSnap.id,
      ...creatorSnap.data(),
    }
  } catch (error) {
    console.error("Error getting creator by uid:", error)
    throw error
  }
}
