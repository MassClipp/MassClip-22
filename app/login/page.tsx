"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from "@/contexts/auth-context"
import { LoginForm } from "@/components/login-form"
import { Loader2 } from 'lucide-react'

export default function LoginPage() {
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  const redirect = searchParams.get("redirect")

  useEffect(() => {
    if (user) {
      // Check for stored redirect URL from purchase flow
      const storedRedirect = localStorage.getItem("redirectAfterLogin")
      if (storedRedirect) {
        localStorage.removeItem("redirectAfterLogin")
        window.location.href = storedRedirect
        return
      }

      // Use redirect parameter or default to dashboard
      const redirectUrl = redirect || "/dashboard"
      router.push(redirectUrl)
    }
  }, [user, router, redirect])

  if (user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden">
        {/* Background gradients matching platform theme */}
        <div className="absolute inset-0 bg-gradient-to-tl from-white/3 via-white/1 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/1 to-white/2" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl" />

        <div className="text-center space-y-6 relative z-10">
          {/* Animated spinner with white gradient */}
          <div className="relative">
            <div className="absolute inset-0 bg-white rounded-full blur-xl opacity-20 animate-pulse" />
            <Loader2 className="h-12 w-12 animate-spin text-white mx-auto relative z-10" />
          </div>

          <p className="text-lg bg-gradient-to-br from-slate-300 via-white to-gray-200 bg-clip-text text-transparent font-medium">
            Redirecting to your dashboard...
          </p>
        </div>
      </div>
    )
  }

  return <LoginForm />
}
