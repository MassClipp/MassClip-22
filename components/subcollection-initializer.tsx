"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { initializeUserSubcollections, checkSubcollectionAccess } from "@/lib/subcollection-initializer"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"

export function SubcollectionInitializer() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<{
    favorites: boolean | null
    history: boolean | null
    message: string | null
  }>({
    favorites: null,
    history: null,
    message: null,
  })

  const checkAccess = async () => {
    if (!user) {
      setStatus({
        favorites: false,
        history: false,
        message: "You must be logged in to check subcollection access",
      })
      return
    }

    setLoading(true)
    setStatus({
      favorites: null,
      history: null,
      message: "Checking subcollection access...",
    })

    try {
      const favoritesAccess = await checkSubcollectionAccess(user.uid, "favorites")
      const historyAccess = await checkSubcollectionAccess(user.uid, "history")

      setStatus({
        favorites: favoritesAccess,
        history: historyAccess,
        message: "Access check complete",
      })
    } catch (error) {
      console.error("Error checking subcollection access:", error)
      setStatus({
        favorites: false,
        history: false,
        message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      })
    } finally {
      setLoading(false)
    }
  }

  const initializeSubcollections = async () => {
    if (!user) {
      setStatus({
        favorites: false,
        history: false,
        message: "You must be logged in to initialize subcollections",
      })
      return
    }

    setLoading(true)
    setStatus({
      favorites: null,
      history: null,
      message: "Initializing subcollections...",
    })

    try {
      const success = await initializeUserSubcollections(user.uid)

      if (success) {
        // Check access after initialization
        const favoritesAccess = await checkSubcollectionAccess(user.uid, "favorites")
        const historyAccess = await checkSubcollectionAccess(user.uid, "history")

        setStatus({
          favorites: favoritesAccess,
          history: historyAccess,
          message: "Subcollections initialized successfully",
        })
      } else {
        setStatus({
          favorites: false,
          history: false,
          message: "Failed to initialize subcollections",
        })
      }
    } catch (error) {
      console.error("Error initializing subcollections:", error)
      setStatus({
        favorites: false,
        history: false,
        message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col space-y-2">
        <h2 className="text-xl font-semibold">Subcollection Access</h2>
        <p className="text-gray-400">
          Check and initialize subcollections to fix permission errors with favorites and history.
        </p>
      </div>

      <div className="flex flex-col space-y-2">
        <div className="flex items-center space-x-2">
          <span>Favorites:</span>
          {status.favorites === null ? (
            <span className="text-gray-400">Unknown</span>
          ) : status.favorites ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <XCircle className="h-5 w-5 text-red-500" />
          )}
        </div>

        <div className="flex items-center space-x-2">
          <span>History:</span>
          {status.history === null ? (
            <span className="text-gray-400">Unknown</span>
          ) : status.history ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <XCircle className="h-5 w-5 text-red-500" />
          )}
        </div>
      </div>

      {status.message && (
        <Alert variant={status.favorites && status.history ? "default" : "destructive"}>
          <AlertTitle>Status</AlertTitle>
          <AlertDescription>{status.message}</AlertDescription>
        </Alert>
      )}

      <div className="flex space-x-4">
        <Button onClick={checkAccess} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Check Access
        </Button>
        <Button onClick={initializeSubcollections} disabled={loading} variant="secondary">
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Initialize Subcollections
        </Button>
      </div>
    </div>
  )
}
