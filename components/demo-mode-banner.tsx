"use client"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangle, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { signOut } from "firebase/auth"
import { auth } from "@/lib/firebase-safe"

export function DemoModeBanner() {
  const handleLogout = async () => {
    try {
      // Sign out from Firebase
      if (auth) {
        await signOut(auth)
      }

      // Clear session cookie
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      })

      // Clear localStorage and sessionStorage
      localStorage.clear()
      sessionStorage.clear()

      // Force reload the page
      window.location.href = "/login?cleared=true"
    } catch (error) {
      console.error("Logout error:", error)
      alert("Failed to log out. Please try clearing your browser cookies manually.")
    }
  }

  return (
    <Alert variant="warning" className="mb-4 border-yellow-600/40 bg-yellow-900/20">
      <AlertTriangle className="h-4 w-4 text-yellow-500" />
      <AlertTitle className="text-yellow-500">Demo Mode</AlertTitle>
      <AlertDescription className="text-yellow-300/80">
        <p className="mb-2">
          Firebase is running in demo mode because environment variables are missing. Some features may be limited.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="border-yellow-600/40 text-yellow-500 hover:bg-yellow-900/30 hover:text-yellow-400"
          onClick={handleLogout}
        >
          <LogOut className="h-3 w-3 mr-2" />
          Clear Auth State
        </Button>
      </AlertDescription>
    </Alert>
  )
}
