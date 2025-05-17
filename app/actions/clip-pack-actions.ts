"use server"

import { db, storage } from "@/lib/firebase-admin"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import type { ClipPack } from "@/lib/types"
import { v4 as uuidv4 } from "uuid"
import admin from "firebase-admin"

// Clip pack validation schema
const clipPackSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  description: z.string().max(1000, "Description must be less than 1000 characters"),
  price: z.number().min(0, "Price must be a positive number"),
  isPaid: z.boolean(),
  isPublished: z.boolean(),
  category: z.string(),
  tags: z.array(z.string()).max(10, "Maximum 10 tags allowed"),
})

export async function createClipPack(userId: string, data: Partial<ClipPack>) {
  try {
    const { title, description, price, isPaid, isPublished, category, tags } = clipPackSchema.parse(data)

    const clipPackId = uuidv4()
    const clipPackRef = db.collection("clipPacks").doc(clipPackId)

    const newClipPack: Omit<ClipPack, "id"> = {
      creatorId: userId,
      title,
      description,
      coverImage: data.coverImage || "",
      price,
      isPaid,
      isPublished,
      clips: [],
      tags,
      category,
      createdAt: new Date(),
      updatedAt: new Date(),
      totalSales: 0,
      totalViews: 0,
    }

    await clipPackRef.set(newClipPack)

    // Add clip pack to user's profile
    const profileRef = db.collection("creatorProfiles").doc(userId)
    await profileRef.update({
      clipPacks: admin.firestore.FieldValue.arrayUnion(clipPackId),
      updatedAt: new Date(),
    })

    revalidatePath("/dashboard/creator/clip-packs")

    return { success: true, clipPackId }
  } catch (error) {
    console.error("Error creating clip pack:", error)
    if (error instanceof z.ZodError) {
      return {
        success: false,
        message: error.errors[0].message,
      }
    }
    return {
      success: false,
      message: "Error creating clip pack",
    }
  }
}

export async function updateClipPack(clipPackId: string, userId: string, data: Partial<ClipPack>) {
  try {
    // Verify ownership
    const clipPackDoc = await db.collection("clipPacks").doc(clipPackId).get()

    if (!clipPackDoc.exists) {
      return { success: false, message: "Clip pack not found" }
    }

    const clipPack = clipPackDoc.data() as ClipPack

    if (clipPack.creatorId !== userId) {
      return { success: false, message: "Unauthorized" }
    }

    // Validate data
    const validData = clipPackSchema.partial().parse(data)

    // Update clip pack
    await db
      .collection("clipPacks")
      .doc(clipPackId)
      .update({
        ...validData,
        updatedAt: new Date(),
      })

    revalidatePath("/dashboard/creator/clip-packs")
    revalidatePath(`/dashboard/creator/clip-packs/${clipPackId}`)

    return { success: true }
  } catch (error) {
    console.error("Error updating clip pack:", error)
    if (error instanceof z.ZodError) {
      return {
        success: false,
        message: error.errors[0].message,
      }
    }
    return {
      success: false,
      message: "Error updating clip pack",
    }
  }
}

export async function deleteClipPack(clipPackId: string, userId: string) {
  try {
    // Verify ownership
    const clipPackDoc = await db.collection("clipPacks").doc(clipPackId).get()

    if (!clipPackDoc.exists) {
      return { success: false, message: "Clip pack not found" }
    }

    const clipPack = clipPackDoc.data() as ClipPack

    if (clipPack.creatorId !== userId) {
      return { success: false, message: "Unauthorized" }
    }

    // Delete all clips in the pack
    for (const clip of clipPack.clips) {
      // Delete video file from storage
      if (clip.videoUrl) {
        const videoPath = clip.videoUrl.split("/").pop()
        if (videoPath) {
          await storage
            .bucket()
            .file(`clips/${videoPath}`)
            .delete()
            .catch((err) => {
              console.warn("Error deleting clip file:", err)
            })
        }
      }

      // Delete thumbnail
      if (clip.thumbnailUrl) {
        const thumbnailPath = clip.thumbnailUrl.split("/").pop()
        if (thumbnailPath) {
          await storage
            .bucket()
            .file(`thumbnails/${thumbnailPath}`)
            .delete()
            .catch((err) => {
              console.warn("Error deleting thumbnail file:", err)
            })
        }
      }
    }

    // Delete clip pack document
    await db.collection("clipPacks").doc(clipPackId).delete()

    // Remove from user's profile
    const profileRef = db.collection("creatorProfiles").doc(userId)
    await profileRef.update({
      clipPacks: admin.firestore.FieldValue.arrayRemove(clipPackId),
      featured: admin.firestore.FieldValue.arrayRemove(clipPackId),
      updatedAt: new Date(),
    })

    revalidatePath("/dashboard/creator/clip-packs")

    return { success: true }
  } catch (error) {
    console.error("Error deleting clip pack:", error)
    return {
      success: false,
      message: "Error deleting clip pack",
    }
  }
}

export async function toggleClipPackFeatured(clipPackId: string, userId: string, featured: boolean) {
  try {
    const profileRef = db.collection("creatorProfiles").doc(userId)
    const profileDoc = await profileRef.get()

    if (!profileDoc.exists) {
      return { success: false, message: "Profile not found" }
    }

    if (featured) {
      await profileRef.update({
        featured: admin.firestore.FieldValue.arrayUnion(clipPackId),
        updatedAt: new Date(),
      })
    } else {
      await profileRef.update({
        featured: admin.firestore.FieldValue.arrayRemove(clipPackId),
        updatedAt: new Date(),
      })
    }

    revalidatePath("/dashboard/creator")
    revalidatePath("/dashboard/creator/clip-packs")

    return { success: true }
  } catch (error) {
    console.error("Error toggling featured status:", error)
    return {
      success: false,
      message: "Error updating featured status",
    }
  }
}

export async function getClipPacks(userId: string) {
  try {
    const snapshot = await db
      .collection("clipPacks")
      .where("creatorId", "==", userId)
      .orderBy("createdAt", "desc")
      .get()

    const clipPacks = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as ClipPack[]

    return { clipPacks }
  } catch (error) {
    console.error("Error fetching clip packs:", error)
    return { clipPacks: [], error: "Failed to fetch clip packs" }
  }
}

export async function getClipPack(clipPackId: string) {
  try {
    const doc = await db.collection("clipPacks").doc(clipPackId).get()

    if (!doc.exists) {
      return { clipPack: null }
    }

    const clipPack = {
      id: doc.id,
      ...doc.data(),
    } as ClipPack

    return { clipPack }
  } catch (error) {
    console.error("Error fetching clip pack:", error)
    return { clipPack: null, error: "Failed to fetch clip pack" }
  }
}
