import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"

export interface UserProfile {
  uid: string
  email: string
  username: string
  displayName: string
  bio?: string
  profilePic?: string
  createdAt: any
  updatedAt: any
}

export interface CreatorProfile {
  uid: string
  username: string
  displayName: string
  bio?: string
  profilePic?: string
  totalVideos: number
  totalDownloads: number
  totalEarnings: number
  isVerified: boolean
  createdAt: any
  updatedAt: any
}

export class ProfileManager {
  /**
   * Check if user has a complete profile
   */
  static async checkUserProfile(uid: string): Promise<{ exists: boolean; profile?: UserProfile }> {
    try {
      const userDoc = await getDoc(doc(db, "users", uid))

      if (userDoc.exists()) {
        const userData = userDoc.data() as UserProfile

        // Check if profile is complete (has username and displayName)
        if (userData.username && userData.displayName) {
          return { exists: true, profile: userData }
        }
      }

      return { exists: false }
    } catch (error) {
      console.error("Error checking user profile:", error)
      return { exists: false }
    }
  }

  /**
   * Generate a unique username from email or display name
   */
  static async generateUniqueUsername(email: string, displayName?: string): Promise<string> {
    // Start with email prefix or display name
    let baseUsername = displayName
      ? displayName.toLowerCase().replace(/[^a-z0-9]/g, "")
      : email
          .split("@")[0]
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "")

    // Ensure minimum length
    if (baseUsername.length < 3) {
      baseUsername = "user" + baseUsername
    }

    // Check if username is available
    let username = baseUsername
    let counter = 1

    while (!(await this.isUsernameAvailable(username))) {
      username = `${baseUsername}${counter}`
      counter++

      // Prevent infinite loop
      if (counter > 999) {
        username = `user${Date.now()}`
        break
      }
    }

    return username
  }

  /**
   * Check if username is available
   */
  static async isUsernameAvailable(username: string): Promise<boolean> {
    try {
      // Check in users collection
      const usersQuery = query(collection(db, "users"), where("username", "==", username.toLowerCase()))
      const usersSnapshot = await getDocs(usersQuery)

      if (!usersSnapshot.empty) {
        return false
      }

      // Check in usernames collection (reserved usernames)
      const usernameDoc = await getDoc(doc(db, "usernames", username.toLowerCase()))

      return !usernameDoc.exists()
    } catch (error) {
      console.error("Error checking username availability:", error)
      return false
    }
  }

  /**
   * Create user profile automatically
   */
  static async createUserProfile(
    uid: string,
    email: string,
    displayName?: string,
    photoURL?: string,
  ): Promise<{ success: boolean; username?: string; error?: string }> {
    try {
      // Generate unique username
      const username = await this.generateUniqueUsername(email, displayName)

      // Create user profile
      const userProfile: UserProfile = {
        uid,
        email,
        username,
        displayName: displayName || username,
        bio: "",
        profilePic: photoURL || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }

      await setDoc(doc(db, "users", uid), userProfile)

      // Reserve username
      await setDoc(doc(db, "usernames", username), {
        uid,
        createdAt: serverTimestamp(),
      })

      console.log(`✅ User profile created for ${username}`)
      return { success: true, username }
    } catch (error) {
      console.error("Error creating user profile:", error)
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
    }
  }

  /**
   * Create creator profile
   */
  static async createCreatorProfile(userProfile: UserProfile): Promise<{ success: boolean; error?: string }> {
    try {
      const creatorProfile: CreatorProfile = {
        uid: userProfile.uid,
        username: userProfile.username,
        displayName: userProfile.displayName,
        bio: userProfile.bio || "",
        profilePic: userProfile.profilePic || null,
        totalVideos: 0,
        totalDownloads: 0,
        totalEarnings: 0,
        isVerified: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }

      await setDoc(doc(db, "creators", userProfile.username), creatorProfile)

      console.log(`✅ Creator profile created for ${userProfile.username}`)
      return { success: true }
    } catch (error) {
      console.error("Error creating creator profile:", error)
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
    }
  }

  /**
   * Complete profile setup (creates both user and creator profiles)
   */
  static async setupCompleteProfile(
    uid: string,
    email: string,
    displayName?: string,
    photoURL?: string,
  ): Promise<{ success: boolean; username?: string; error?: string }> {
    try {
      // Check if profile already exists
      const { exists, profile } = await this.checkUserProfile(uid)

      if (exists && profile) {
        console.log(`✅ Profile already exists for user ${uid}`)
        return { success: true, username: profile.username }
      }

      // Create user profile
      const userResult = await this.createUserProfile(uid, email, displayName, photoURL)

      if (!userResult.success) {
        return userResult
      }

      // Get the created user profile
      const { profile: newProfile } = await this.checkUserProfile(uid)

      if (!newProfile) {
        return { success: false, error: "Failed to retrieve created profile" }
      }

      // Create creator profile
      const creatorResult = await this.createCreatorProfile(newProfile)

      if (!creatorResult.success) {
        return { success: false, error: creatorResult.error }
      }

      return { success: true, username: userResult.username }
    } catch (error) {
      console.error("Error setting up complete profile:", error)
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
    }
  }
}
