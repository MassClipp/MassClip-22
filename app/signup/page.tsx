"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useFirebaseAuthStable } from "@/hooks/use-firebase-auth-stable"
import { Loader2 } from "lucide-react"
import { SignupForm } from "@/components/signup-form"

export default function SignupPage() {
  const router = useRouter()
  const { authChecked, user, loading, isInitialized } = useFirebaseAuthStable()

  // Redirect if user is already authenticated
  useEffect(() => {
    if (isInitialized && authChecked && user) {
      console.log("🔄 User already authenticated, redirecting to login-success")
      router.push("/login-success")
    }
  }, [isInitialized, authChecked, user, router])

  // Show loading while checking auth state
  if (loading || !isInitialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-red-600" />
          <p className="text-gray-600 text-lg">Loading...</p>
        </div>
      </div>
    )
  }

  return <SignupForm />
}
