"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

export function usePremiumAccess(creatorId: string) {
  const { user } = useAuth()
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const checkAccess = async () => {
      if (!user || !creatorId) {
        setHasAccess(false)
        setIsLoading(false)
        return
      }

      try {
        // Check if user has access to this creator's premium content
        const accessRef = doc(db, "userAccess", user.uid)
        const accessDoc = await getDoc(accessRef)

        if (accessDoc.exists()) {
          const accessData = accessDoc.data()
          setHasAccess(accessData.creatorId === creatorId && accessData.accessGranted === true)
        } else {
          setHasAccess(false)
        }
      } catch (err) {
        console.error("Error checking premium access:", err)
        setError(err instanceof Error ? err : new Error("Failed to check premium access"))
        setHasAccess(false)
      } finally {
        setIsLoading(false)
      }
    }

    checkAccess()
  }, [user, creatorId])

  return { hasAccess, isLoading, error }
}
