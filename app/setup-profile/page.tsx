"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { getCreatorByUid } from "@/lib/creator-utils"
import { SetupProfileForm } from "@/components/setup-profile-form"
import Logo from "@/components/logo"

export default function SetupProfilePage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    const checkExistingProfile = async () => {
      if (!user) return

      try {
        const creator = await getCreatorByUid(user.uid)

        // If user already has a profile, redirect to their profile page
        if (creator) {
          router.push(`/creator/${creator.username}`)
        }
      } catch (error) {
        console.error("Error checking existing profile:", error)
      }
    }

    if (!loading) {
      // If not logged in, redirect to login
      if (!user) {
        router.push("/login")
      } else {
        checkExistingProfile()
      }
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col justify-center items-center">
        <div className="w-16 h-16 border-t-2 border-red-600 border-solid rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex flex-col justify-center items-center px-4">
      {/* Premium Gradient Background */}
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-black via-black to-gray-900"></div>

      <Logo href="/" size="md" linkClassName="absolute top-8 left-8 z-10" />

      <div className="w-full max-w-md p-8 space-y-8 bg-black/60 backdrop-blur-sm rounded-xl border border-gray-800 shadow-2xl relative z-10">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">Set Up Your Creator Profile</h1>
          <p className="text-gray-400 mt-2">Create your public profile to showcase your content</p>
        </div>

        <SetupProfileForm />
      </div>
    </div>
  )
}
