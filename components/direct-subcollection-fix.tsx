"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { doc, setDoc, collection, getDocs, query, limit } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, Loader2 } from "lucide-react"

export function DirectSubcollectionFix() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<{
    success: boolean | null
    message: string | null
  }>({
    success: null,
    message: null,
  })

  const fixSubcollections = async () => {
    if (!user) {
      setStatus({
        success: false,
        message: "You must be logged in to fix subcollections",
      })
      return
    }

    setLoading(true)
    setStatus({
      success: null,
      message: "Fixing subcollections...",
    })

    try {
      // Create a permanent document in favorites subcollection with a valid ID
      const favoritesRef = collection(db, `users/${user.uid}/favorites`)
      await setDoc(doc(favoritesRef, "placeholder_doc"), {
        createdAt: new Date(),
        system: true,
        message: "This document ensures the favorites subcollection exists",
      })

      // Create a permanent document in history subcollection with a valid ID
      const historyRef = collection(db, `users/${user.uid}/history`)
      await setDoc(doc(historyRef, "placeholder_doc"), {
        createdAt: new Date(),
        system: true,
        message: "This document ensures the history subcollection exists",
      })

      // Verify we can read from the subcollections
      try {
        const favoritesQuery = query(favoritesRef, limit(1))
        await getDocs(favoritesQuery)

        const historyQuery = query(historyRef, limit(1))
        await getDocs(historyQuery)

        setStatus({
          success: true,
          message: "Subcollections fixed successfully! You can now use favorites and history.",
        })
      } catch (readError) {
        console.error("Error verifying subcollections:", readError)
        setStatus({
          success: false,
          message: "Created subcollections but couldn't verify access. Please try again or contact support.",
        })
      }
    } catch (error) {
      console.error("Error fixing subcollections:", error)
      setStatus({
        success: false,
        message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 max-w-md mx-auto">
      <div className="flex flex-col space-y-2">
        <h2 className="text-xl font-semibold">Fix Subcollection Permissions</h2>
        <p className="text-gray-400">
          This will create the necessary subcollections for your account to fix permission errors.
        </p>
      </div>

      {status.message && (
        <Alert variant={status.success ? "default" : "destructive"}>
          <AlertTitle>{status.success ? "Success" : "Error"}</AlertTitle>
          <AlertDescription>{status.message}</AlertDescription>
        </Alert>
      )}

      <Button onClick={fixSubcollections} disabled={loading} className="w-full bg-red-600 hover:bg-red-700 text-white">
        {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
        {loading ? "Fixing Permissions..." : "Fix Permissions Now"}
      </Button>

      {status.success && (
        <div className="flex items-center justify-center space-x-2 text-green-500">
          <CheckCircle className="h-5 w-5" />
          <span>Fixed successfully! You can now return to your favorites.</span>
        </div>
      )}
    </div>
  )
}
