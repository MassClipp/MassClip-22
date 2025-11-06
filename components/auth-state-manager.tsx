"use client"

import { useState } from "react"
import { signOut } from "firebase/auth"
import { auth } from "@/lib/firebase-safe"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { LogOut, RefreshCw } from "lucide-react"

export function AuthStateManager() {
  const [clearing, setClearing] = useState(false)
  const [message, setMessage] = useState("")

  const clearAuthState = async () => {
    setClearing(true)
    setMessage("")

    try {
      // 1. Sign out from Firebase
      if (auth) {
        await signOut(auth)
        console.log("✅ Signed out from Firebase")
      }

      // 2. Clear server-side session
      await fetch("/api/auth/clear-session", {
        method: "POST",
        credentials: "include",
      })
      console.log("✅ Cleared server session")

      // 3. Clear local storage
      localStorage.clear()
      sessionStorage.clear()
      console.log("✅ Cleared local storage")

      // 4. Clear any cached data
      if ("caches" in window) {
        const cacheNames = await caches.keys()
        await Promise.all(cacheNames.map((name) => caches.delete(name)))
        console.log("✅ Cleared caches")
      }

      setMessage("Auth state cleared successfully! Redirecting...")

      // 5. Redirect to login
      setTimeout(() => {
        window.location.href = "/login?cleared=true"
      }, 1000)
    } catch (error) {
      console.error("Error clearing auth state:", error)
      setMessage("Error clearing auth state. Try manually clearing browser data.")
    } finally {
      setClearing(false)
    }
  }

  return (
    <div className="space-y-4">
      <Button onClick={clearAuthState} disabled={clearing} variant="destructive" className="w-full">
        {clearing ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <LogOut className="h-4 w-4 mr-2" />}
        {clearing ? "Clearing..." : "Clear Auth State & Restart"}
      </Button>

      {message && (
        <Alert>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      <div className="text-sm text-gray-600">
        <p>This will:</p>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>Sign out from Firebase</li>
          <li>Clear server-side session</li>
          <li>Clear browser storage</li>
          <li>Clear cached data</li>
          <li>Redirect to login page</li>
        </ul>
      </div>
    </div>
  )
}
