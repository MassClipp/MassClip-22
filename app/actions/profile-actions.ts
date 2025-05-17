"use server"

import { db } from "@/lib/firebase-admin"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import type { CreatorProfile } from "@/lib/types"

// Username validation schema
const usernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(30, "Username must be less than 30 characters")
  .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores")
  .refine(async (username) => {
    // Check if username already exists
    const snapshot = await db.collection("creatorProfiles").where("username", "==", username.toLowerCase()).get()

    return snapshot.empty
  }, "Username is already taken")

// Profile update schema
const profileUpdateSchema = z.object({
  displayName: z.string().min(1, "Display name is required").max(50),
  bio: z.string().max(500, "Bio must be less than 500 characters"),
  socialLinks: z
    .object({
      instagram: z.string().optional(),
      twitter: z.string().optional(),
      youtube: z.string().optional(),
      tiktok: z.string().optional(),
      website: z.string().url().optional().or(z.literal("")),
    })
    .optional(),
})

export async function checkUsernameAvailability(username: string) {
  try {
    await usernameSchema.parseAsync(username)
    return { available: true }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        available: false,
        message: error.errors[0].message,
      }
    }
    return {
      available: false,
      message: "Error checking username availability",
    }
  }
}

export async function updateCreatorProfile(
  userId: string,
  data: {
    username?: string
    displayName?: string
    bio?: string
    socialLinks?: Record<string, string>
  },
) {
  try {
    // Validate username if provided
    if (data.username) {
      await usernameSchema.parseAsync(data.username)
    }

    // Validate other profile data
    const { displayName, bio, socialLinks } = profileUpdateSchema.parse(data)

    // Get existing profile or create new one
    const profileRef = db.collection("creatorProfiles").doc(userId)
    const profileDoc = await profileRef.get()

    if (profileDoc.exists) {
      // Update existing profile
      await profileRef.update({
        ...(data.username && { username: data.username.toLowerCase() }),
        ...(displayName && { displayName }),
        ...(bio && { bio }),
        ...(socialLinks && { socialLinks }),
        updatedAt: new Date(),
      })
    } else {
      // Create new profile
      const newProfile: Omit<CreatorProfile, "uid"> = {
        username: data.username?.toLowerCase() || userId,
        displayName: displayName || "Creator",
        bio: bio || "",
        profileImage: "",
        coverImage: "",
        socialLinks: socialLinks || {},
        clipPacks: [],
        featured: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        isVerified: false,
        totalSales: 0,
        totalViews: 0,
      }

      await profileRef.set(newProfile)
    }

    revalidatePath(`/creator/${data.username || userId}`)
    revalidatePath("/dashboard/creator")

    return { success: true }
  } catch (error) {
    console.error("Error updating creator profile:", error)
    if (error instanceof z.ZodError) {
      return {
        success: false,
        message: error.errors[0].message,
      }
    }
    return {
      success: false,
      message: "Error updating profile",
    }
  }
}

export async function getCreatorProfile(usernameOrId: string) {
  try {
    let profileDoc

    // First try to find by username
    const usernameSnapshot = await db
      .collection("creatorProfiles")
      .where("username", "==", usernameOrId.toLowerCase())
      .limit(1)
      .get()

    if (!usernameSnapshot.empty) {
      profileDoc = usernameSnapshot.docs[0]
    } else {
      // Try to find by user ID
      const idDoc = await db.collection("creatorProfiles").doc(usernameOrId).get()
      if (idDoc.exists) {
        profileDoc = idDoc
      }
    }

    if (profileDoc && profileDoc.exists) {
      const profile = {
        uid: profileDoc.id,
        ...profileDoc.data(),
      } as CreatorProfile

      return { profile }
    }

    return { profile: null }
  } catch (error) {
    console.error("Error fetching creator profile:", error)
    return { profile: null, error: "Failed to fetch profile" }
  }
}
