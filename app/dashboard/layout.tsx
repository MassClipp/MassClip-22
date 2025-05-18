"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { getCreatorByUid } from "@/lib/creator-utils"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [hasProfile, setHasProfile] = useState<boolean | null>(null)
  const [isCheckingProfile, setIsCheckingProfile] = useState(true)

  useEffect(() => {
    const checkCreatorProfile = async () => {
      if (!user) return

      try {
        setIsCheckingProfile(true)
        const creator = await getCreatorByUid(user.uid)
        setHasProfile(!!creator)
      } catch (error) {
        console.error("Error checking creator profile:", error)
      } finally {
        setIsCheckingProfile(false)
      }
    }

    if (!loading) {
      if (!user) {
        router.push("/login")
      } else {
        checkCreatorProfile()
      }
    }
  }, [user, loading, router])

  useEffect(() => {
    // If we've checked and the user doesn't have a profile, redirect to setup
    if (!isCheckingProfile && hasProfile === false) {
      router.push("/setup-profile")
    }
  }, [hasProfile, isCheckingProfile, router])

  if (loading || isCheckingProfile) {
    return (
      <div className="min-h-screen bg-black flex flex-col justify-center items-center">
        <div className="w-16 h-16 border-t-2 border-red-600 border-solid rounded-full animate-spin"></div>
      </div>
    )
  }

  return children
}
