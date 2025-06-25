"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

export default function LoginSuccessPage() {
  const router = useRouter()
  const [attempts, setAttempts] = useState(0)

  useEffect(() => {
    const redirect = async () => {
      try {
        console.log(`🔄 Login success redirect attempt ${attempts + 1}`)

        // Check if session is properly set
        const sessionCheck = await fetch("/api/auth/check-session")
        const sessionData = await sessionCheck.json()

        console.log("📋 Session check result:", sessionData)

        if (sessionData.hasSession) {
          console.log("✅ Session confirmed, redirecting to dashboard")
          // Use window.location for a hard redirect
          window.location.href = "/dashboard"
        } else {
          console.log("❌ No session found, retrying...")
          if (attempts < 3) {
            setTimeout(() => setAttempts((prev) => prev + 1), 1000)
          } else {
            console.log("❌ Max attempts reached, redirecting to login")
            window.location.href = "/login"
          }
        }
      } catch (error) {
        console.error("❌ Redirect error:", error)
        window.location.href = "/dashboard" // Force redirect anyway
      }
    }

    redirect()
  }, [attempts, router])

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-white mx-auto mb-4" />
        <p className="text-gray-400 mb-2">Login successful! Redirecting...</p>
        <p className="text-xs text-gray-500">Attempt {attempts + 1} of 4</p>
        <p className="text-xs text-gray-500 mt-4">
          If you're not redirected,{" "}
          <a href="/dashboard" className="text-red-500 underline">
            click here
          </a>
        </p>
      </div>
    </div>
  )
}
