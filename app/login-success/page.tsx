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
          console.log("✅ Session confirmed, checking if first-time user")

          try {
            // Get the user's ID token for the API call
            const user = sessionData.user
            if (user) {
              const idToken = await user.getIdToken()
              const userProfileCheck = await fetch("/api/user/check-first-time", {
                headers: {
                  Authorization: `Bearer ${idToken}`,
                },
              })
              const profileData = await userProfileCheck.json()

              if (profileData.isFirstTime) {
                console.log("🆕 First-time user detected, redirecting to welcome page")
                window.location.href = "/welcome"
                return
              }
            }
          } catch (error) {
            console.log("⚠️ Could not check first-time status, proceeding to dashboard:", error)
          }

          console.log("✅ Returning user, redirecting to dashboard")
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
    <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden">
      {/* Background gradients matching platform theme */}
      <div className="absolute inset-0 bg-gradient-to-tl from-white/3 via-white/1 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/1 to-white/2" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl" />

      <div className="text-center relative z-10 space-y-6">
        {/* Animated spinner with teal gradient */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-teal-400 rounded-full blur-xl opacity-20 animate-pulse" />
          <Loader2 className="h-12 w-12 animate-spin text-cyan-400 mx-auto relative z-10" />
        </div>

        <div className="space-y-2">
          <p className="text-lg bg-gradient-to-br from-slate-300 via-cyan-200 to-white bg-clip-text text-transparent font-medium">
            Login successful!
          </p>
          <p className="text-sm text-gray-400">Redirecting to your dashboard...</p>
          <p className="text-xs text-gray-500">Attempt {attempts + 1} of 4</p>
        </div>

        <p className="text-xs text-gray-500 mt-6">
          If you're not redirected,{" "}
          <a href="/dashboard" className="text-cyan-400 hover:text-cyan-300 underline transition-colors">
            click here
          </a>
        </p>
      </div>
    </div>
  )
}
