"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, Package, User, DollarSign, Clock, AlertTriangle, LogIn, ShoppingBag } from "lucide-react"
import Link from "next/link"

interface Bundle {
  id: string
  title: string
  description: string
  thumbnailUrl: string
  price: number
  currency: string
}

interface Creator {
  id: string
  name: string
  username: string
}

function PurchaseSuccessContent() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isProcessing, setIsProcessing] = useState(true)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bundle, setBundle] = useState<Bundle | null>(null)
  const [creator, setCreator] = useState<Creator | null>(null)
  const [alreadyPurchased, setAlreadyPurchased] = useState(false)
  const [accessGranted, setAccessGranted] = useState(false)
  const [needsLogin, setNeedsLogin] = useState(false)

  const productBoxId = searchParams.get("product_box_id")
  const creatorId = searchParams.get("creator_id")
  const testMode = searchParams.get("test_mode") === "true"

  useEffect(() => {
    console.log(`🎉 [Purchase Success] Page loaded with params:`, {
      productBoxId,
      creatorId,
      testMode,
      currentUser: user?.uid,
    })

    if (!productBoxId || !creatorId) {
      setError("Invalid purchase parameters")
      setIsProcessing(false)
      return
    }

    if (!user) {
      // User is not logged in, show login prompt with purchase context
      setNeedsLogin(true)
      setIsProcessing(false)
      return
    }

    verifyAndGrantAccess()
  }, [user, productBoxId, creatorId])

  const verifyAndGrantAccess = async () => {
    if (!user || !productBoxId || !creatorId) return

    try {
      console.log(`🔄 [Purchase Success] Verifying purchase and granting access...`)

      const idToken = await user.getIdToken()
      const response = await fetch("/api/bundle/grant-access", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          bundleId: productBoxId,
          creatorId: creatorId,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to verify purchase")
      }

      console.log(`✅ [Purchase Success] Access granted successfully:`, result)

      setBundle(result.bundle)
      setCreator(result.creator)
      setAlreadyPurchased(result.alreadyPurchased)
      setAccessGranted(true)
      setSuccess(true)
    } catch (err: any) {
      console.error(`❌ [Purchase Success] Error:`, err)
      setError(err.message || "Failed to verify purchase")
    } finally {
      setTimeout(() => {
        setIsProcessing(false)
      }, 1500)
    }
  }

  const handleLogin = () => {
    // Preserve the current URL parameters for after login
    const currentUrl = window.location.href
    localStorage.setItem("redirectAfterLogin", currentUrl)
    router.push("/login")
  }

  // Loading state with gradient background
  if (isProcessing) {
    return (
      <div className="min-h-screen bg-black relative overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/10" />
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center space-y-4">
            <div className="flex space-x-2">
              <div className="w-3 h-3 bg-red-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-3 h-3 bg-red-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-3 h-3 bg-red-600 rounded-full animate-bounce"></div>
            </div>
            <p className="text-white/70 text-sm">Verifying your purchase...</p>
          </div>
        </div>
      </div>
    )
  }

  // Login required state
  if (needsLogin) {
    return (
      <div className="min-h-screen bg-black relative overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/10" />
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/3 rounded-full blur-2xl" />
        </div>

        {/* Logo */}
        <div className="absolute top-8 left-8 z-20">
          <Link href="/" className="text-2xl font-bold text-red-600">
            MassClip
          </Link>
        </div>

        <div className="relative z-10 flex items-center justify-center min-h-screen px-4">
          <Card className="w-full max-w-md bg-black/40 backdrop-blur-xl border-white/10">
            <CardContent className="p-8 text-center">
              {/* Success Icon */}
              <div className="mb-6">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShoppingBag className="h-8 w-8 text-green-400" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">🎉 Purchase Successful!</h1>
                <p className="text-white/70">Your payment has been processed successfully.</p>
              </div>

              {/* Login Prompt */}
              <Alert className="mb-6 bg-blue-500/10 border-blue-500/20">
                <LogIn className="h-4 w-4 text-blue-400" />
                <AlertDescription className="text-blue-200">
                  <strong>Almost there!</strong> Please log in to access your purchased content and have it added to
                  your account.
                </AlertDescription>
              </Alert>

              {/* Purchase Details Preview */}
              {productBoxId && (
                <div className="mb-6 p-4 bg-white/5 rounded-lg border border-white/10">
                  <div className="flex items-center space-x-3 text-left">
                    <Package className="h-5 w-5 text-white/60" />
                    <div>
                      <p className="font-medium text-white">Premium Content Bundle</p>
                      <p className="text-sm text-white/60">Ready to be added to your account</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3">
                <Button onClick={handleLogin} className="w-full bg-red-600 hover:bg-red-700 text-white">
                  <LogIn className="w-4 h-4 mr-2" />
                  Log In to Access Content
                </Button>

                <Button
                  asChild
                  variant="outline"
                  className="w-full bg-transparent border-white/20 text-white hover:bg-white/10"
                >
                  <Link href="/signup">Create New Account</Link>
                </Button>
              </div>

              {/* Info */}
              <div className="mt-6 p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                <h3 className="font-medium text-green-200 mb-2">✅ What happens next:</h3>
                <ul className="text-sm text-green-200/80 space-y-1 text-left">
                  <li>• Your payment has been confirmed</li>
                  <li>• Log in to automatically receive access</li>
                  <li>• Content will be added to your account</li>
                  <li>• Enjoy lifetime access to your purchase</li>
                </ul>
              </div>

              {/* Footer */}
              <div className="mt-6 text-center text-sm text-white/50">
                Secure purchase verification • No additional charges
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-black relative overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/10" />
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 flex items-center justify-center min-h-screen px-4">
          <Card className="w-full max-w-md bg-black/40 backdrop-blur-xl border-white/10">
            <CardContent className="p-8 text-center">
              <AlertTriangle className="h-16 w-16 text-red-400 mx-auto mb-4" />
              <h1 className="text-xl font-bold text-white mb-2">Something went wrong</h1>
              <p className="text-white/70 mb-6">{error}</p>
              <div className="space-y-3">
                <Button onClick={() => window.location.reload()} className="w-full bg-red-600 hover:bg-red-700">
                  Try Again
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="w-full bg-transparent border-white/20 text-white hover:bg-white/10"
                >
                  <Link href="/dashboard/purchases">My Purchases</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Success state
  if (success && bundle) {
    return (
      <div className="min-h-screen bg-black relative overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/10" />
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/3 rounded-full blur-2xl" />
        </div>

        {/* Logo */}
        <div className="absolute top-8 left-8 z-20">
          <Link href="/" className="text-2xl font-bold text-red-600">
            MassClip
          </Link>
        </div>

        <div className="relative z-10 flex items-center justify-center min-h-screen py-12 px-4">
          <Card className="w-full max-w-md bg-black/40 backdrop-blur-xl border-white/10">
            <CardContent className="p-6">
              {/* Success Header */}
              <div className="text-center mb-6">
                <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-white mb-2">
                  {testMode ? "🧪 Test Purchase Complete!" : "⚡ Access Granted!"}
                </h1>
                <p className="text-white/70">
                  {alreadyPurchased
                    ? "Welcome back! You already have access to this bundle."
                    : "Your purchase is complete and access granted automatically!"}
                </p>
              </div>

              {/* Test Mode Warning */}
              {testMode && (
                <Alert className="mb-6 bg-yellow-500/10 border-yellow-500/20">
                  <AlertTriangle className="h-4 w-4 text-yellow-400" />
                  <AlertDescription className="text-yellow-200">
                    <strong>TEST MODE:</strong> This was a test purchase using Stripe test cards. No real money was
                    charged.
                  </AlertDescription>
                </Alert>
              )}

              {/* Bundle Details */}
              <div className="space-y-4 mb-6">
                <div className="flex items-center space-x-3">
                  <Package className="h-5 w-5 text-white/60" />
                  <div>
                    <p className="font-medium text-white">{bundle.title}</p>
                    <p className="text-sm text-white/60">{bundle.description}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <DollarSign className="h-5 w-5 text-white/60" />
                  <div>
                    <p className="font-medium text-white">
                      ${bundle.price.toFixed(2)} {bundle.currency.toUpperCase()}
                    </p>
                    <p className="text-sm text-white/60">{testMode ? "Test payment" : "Payment completed"}</p>
                  </div>
                </div>

                {creator && (
                  <div className="flex items-center space-x-3">
                    <User className="h-5 w-5 text-white/60" />
                    <div>
                      <p className="font-medium text-white">by {creator.name}</p>
                      {creator.username && <p className="text-sm text-white/60">@{creator.username}</p>}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <Button asChild className="w-full bg-red-600 hover:bg-red-700">
                  <Link href={`/product-box/${bundle.id}/content`}>⚡ Access Your Bundle Now</Link>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  className="w-full bg-transparent border-white/20 text-white hover:bg-white/10"
                >
                  <Link href="/dashboard/purchases">My Purchases</Link>
                </Button>
              </div>

              {/* Success Checklist */}
              <div className="mt-6 p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                <h3 className="font-medium text-green-200 mb-2">⚡ Access Granted!</h3>
                <ul className="text-sm text-green-200/80 space-y-1">
                  <li>✅ {testMode ? "Test payment" : "Payment"} completed successfully</li>
                  <li>⚡ Access granted automatically - no waiting!</li>
                  <li>🔐 Content added to your account</li>
                  <li>📝 Purchase recorded in your profile</li>
                  <li>🔄 Lifetime access to this bundle</li>
                  {testMode && <li>🧪 Test mode - no real charges applied</li>}
                </ul>
              </div>

              {/* Footer */}
              <div className="mt-6 text-center text-sm text-white/50">
                ⚡ Automatic access granted - enjoy your content!
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return null
}

export default function PurchaseSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black relative overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/10" />
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
          </div>
          <div className="relative z-10 flex items-center justify-center min-h-screen">
            <Card className="w-full max-w-md bg-black/40 backdrop-blur-xl border-white/10">
              <CardContent className="p-6 text-center">
                <Clock className="h-12 w-12 text-red-400 mx-auto mb-4 animate-spin" />
                <h2 className="text-xl font-semibold text-white mb-2">Loading...</h2>
              </CardContent>
            </Card>
          </div>
        </div>
      }
    >
      <PurchaseSuccessContent />
    </Suspense>
  )
}
