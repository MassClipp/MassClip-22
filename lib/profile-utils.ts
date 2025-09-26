import type React from "react"
import type { User } from "firebase/auth"
import { doc, setDoc, serverTimestamp } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { db, storage } from "@/lib/firebase"
import type { Crop } from "react-image-crop"

export async function handleSubmit(
  e: React.FormEvent,
  user: User | null,
  setDisplayName: (name: string) => void,
  setUsername: (username: string) => void,
  setBio: (bio: string) => void,
  setProfilePic: (pic: string | null) => void,
  setNewProfilePic: (pic: File | null) => void,
  setSaveSuccess: (success: boolean) => void,
  toast: any,
) {
  e.preventDefault()
  if (!user) return

  try {
    console.log("💾 Saving profile changes...")

    const formData = new FormData(e.target as HTMLFormElement)
    const displayName = formData.get("displayName") as string
    const username = formData.get("username") as string
    const bio = formData.get("bio") as string
    const instagramHandle = formData.get("instagram") as string
    const twitterHandle = formData.get("twitter") as string
    const websiteUrl = formData.get("website") as string

    let profilePicUrl = null

    // Handle profile picture upload if there's a new one
    const newProfilePicFile = (e.target as any).newProfilePic
    if (newProfilePicFile) {
      const storageRef = ref(storage, `profile-pics/${user.uid}`)
      await uploadBytes(storageRef, newProfilePicFile)
      profilePicUrl = await getDownloadURL(storageRef)
    }

    const updateData = {
      displayName: displayName?.trim() || "",
      username: username?.trim().toLowerCase() || "",
      bio: bio?.trim() || "",
      socialLinks: {
        instagram: instagramHandle?.trim() || "",
        twitter: twitterHandle?.trim() || "",
        website: websiteUrl?.trim() || "",
      },
      updatedAt: serverTimestamp(),
      ...(profilePicUrl && { profilePic: profilePicUrl }),
    }

    await setDoc(doc(db, "users", user.uid), updateData, { merge: true })

    // Update local state
    setDisplayName(updateData.displayName)
    setUsername(updateData.username)
    setBio(updateData.bio)
    if (profilePicUrl) {
      setProfilePic(profilePicUrl)
      setNewProfilePic(null)
    }

    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 3000)

    toast({
      title: "Success",
      description: "Profile updated successfully!",
    })

    console.log("✅ Profile saved successfully")
  } catch (error) {
    console.error("❌ Error saving profile:", error)
    toast({
      title: "Error",
      description: "Failed to save profile. Please try again.",
      variant: "destructive",
    })
  }
}

export function handleViewProfile(username: string) {
  if (username) {
    window.open(`/creator/${username}`, "_blank")
  }
}

export function handleCropComplete(
  completedCrop: Crop | undefined,
  setImageToCrop: (image: string | null) => void,
  setShowCropModal: (show: boolean) => void,
  setProfilePicPreview: (preview: string | null) => void,
  setNewProfilePic: (file: File | null) => void,
) {
  if (!completedCrop) return

  // Create canvas to crop the image
  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")
  if (!ctx) return

  const image = document.querySelector('img[alt="Crop me"]') as HTMLImageElement
  if (!image) return

  const scaleX = image.naturalWidth / image.width
  const scaleY = image.naturalHeight / image.height

  canvas.width = completedCrop.width
  canvas.height = completedCrop.height

  ctx.drawImage(
    image,
    completedCrop.x * scaleX,
    completedCrop.y * scaleY,
    completedCrop.width * scaleX,
    completedCrop.height * scaleY,
    0,
    0,
    completedCrop.width,
    completedCrop.height,
  )

  canvas.toBlob(
    (blob) => {
      if (!blob) return

      const file = new File([blob], "profile-pic.jpg", { type: "image/jpeg" })
      const previewUrl = URL.createObjectURL(blob)

      setNewProfilePic(file)
      setProfilePicPreview(previewUrl)
      setShowCropModal(false)
      setImageToCrop(null)
    },
    "image/jpeg",
    0.9,
  )
}
