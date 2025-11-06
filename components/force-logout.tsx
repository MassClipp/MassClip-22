"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export function ForceLogout() {
  const router = useRouter()

  useEffect(() => {
    const logout = async () => {
      try {
        // Clear the session cookie
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        })

        // Clear any local storage or session storage items
        localStorage.clear()
        sessionStorage.clear()

        // Clear any cookies by setting them to expire
        document.cookie.split(";").forEach((c) => {
          document.cookie = c.replace(/^ +/, "").replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`)
        })

        // Force reload to clear any cached state
        window.location.href = "/login?forcedLogout=true"
      } catch (error) {
        console.error("Error during force logout:", error)
        // Fallback to simple redirect
        router.push("/login?forcedLogout=true")
      }
    }

    logout()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Logging out...</h1>
        <p>Please wait while we securely log you out.</p>
      </div>
    </div>
  )
}
