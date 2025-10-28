"use client"
import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useFirebaseAuthStable } from "@/hooks/use-firebase-auth-stable"
import { Loader2 } from "lucide-react"
import { SignupForm } from "@/components/signup-form"
import { useToast } from "@/hooks/use-toast"

export default function SignupPage() {
  const router = useRouter()
  const { authChecked, user, loading, isInitialized } = useFirebaseAuthStable()
  const { toast } = useToast()
  const initialAuthChecked = useRef(false)
  const wasAuthenticatedOnLoad = useRef(false)

  useEffect(() => {
    if (isInitialized && authChecked && !initialAuthChecked.current) {
      initialAuthChecked.current = true
      wasAuthenticatedOnLoad.current = !!user
    }
  }, [isInitialized, authChecked, user])

  useEffect(() => {
    if (isInitialized && authChecked && user && wasAuthenticatedOnLoad.current) {
      console.log("🔄 User was already authenticated on load, redirecting to landing page")
      toast({
        title: "Already logged in",
        description: "You already have an account and are logged in.",
        variant: "default",
      })
      router.push("/")
    }
  }, [isInitialized, authChecked, user, router, toast])

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
