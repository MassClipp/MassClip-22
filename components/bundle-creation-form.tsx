"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/auth-context"
import { useUserPlan } from "@/hooks/use-user-plan"
import { AlertCircle, Crown } from "lucide-react"
import { toast } from "sonner"
import { useToast } from "@/hooks/use-toast"

interface BundleCreationFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

export function BundleCreationForm({ onSuccess, onCancel }: BundleCreationFormProps) {
  const { user } = useAuth()
  const { isProUser, loading: planLoading } = useUserPlan()
  const { toast: customToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [canCreateBundle, setCanCreateBundle] = useState(true)
  const [bundleLimitInfo, setBundleLimitInfo] = useState<any>(null)
  const [stripeStatus, setStripeStatus] = useState<{
    connected: boolean
    fullySetup: boolean
    loading: boolean
  }>({ connected: false, fullySetup: false, loading: true })

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    thumbnailUrl: "",
  })

  useEffect(() => {
    const checkStripeStatus = async () => {
      if (!user?.uid) return

      try {
        setStripeStatus((prev) => ({ ...prev, loading: true }))
        const response = await fetch(`/api/stripe/connect/status-check?userId=${user.uid}&refresh=true`)
        const data = await response.json()

        console.log("[v0] Stripe status check result:", data)

        setStripeStatus({
          connected: data.connected || false,
          fullySetup: data.fullySetup || false,
          loading: false,
        })
      } catch (error) {
        console.error("[v0] Error checking Stripe status:", error)
        setStripeStatus({ connected: false, fullySetup: false, loading: false })
      }
    }

    checkStripeStatus()
  }, [user?.uid])

  useEffect(() => {
    const checkLimits = async () => {
      if (!user?.uid || planLoading) return

      try {
        const response = await fetch(`/api/user/check-bundle-limits?type=create`)
        const data = await response.json()

        setCanCreateBundle(data.canCreate)
        setBundleLimitInfo(data)
      } catch (error) {
        console.error("Error checking bundle limits:", error)
      }
    }

    checkLimits()
  }, [user?.uid, planLoading])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripeStatus.connected || !stripeStatus.fullySetup) {
      customToast({
        variant: "gradient",
        title: "Stripe Account Required",
        description: stripeStatus.connected
          ? "Please complete your Stripe account setup to start selling bundles."
          : "You need to connect your Stripe account to sell bundles and receive payments.",
        action: (
          <Button
            size="sm"
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10 bg-transparent"
            onClick={() => window.open("/dashboard/earnings", "_blank")}
          >
            {stripeStatus.connected ? "Complete Setup" : "Connect Stripe"}
          </Button>
        ),
      })
      return
    }

    if (!canCreateBundle) {
      customToast({
        variant: "gradient",
        title: "Bundle Limit Reached",
        description: "Upgrade to Creator Pro for unlimited bundles and more features.",
        action: (
          <Button
            size="sm"
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10 bg-transparent"
            onClick={() => window.open("https://buy.stripe.com/14A6oHeWEeJngFv4SzeIw04", "_blank")}
          >
            Upgrade Now
          </Button>
        ),
      })
      return
    }

    if (!user?.uid) {
      customToast({
        variant: "gradient",
        title: "Authentication Required",
        description: "You must be logged in to create a bundle.",
      })
      return
    }

    if (!formData.title.trim() || !formData.description.trim() || !formData.price) {
      customToast({
        variant: "gradient",
        title: "Missing Information",
        description: "Please fill in all required fields to create your bundle.",
      })
      return
    }

    setLoading(true)

    try {
      const idToken = await user.getIdToken()

      const response = await fetch("/api/creator/bundles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          title: formData.title.trim(),
          description: formData.description.trim(),
          price: Number.parseFloat(formData.price),
          thumbnailUrl: formData.thumbnailUrl.trim() || null,
          contentItems: [],
        }),
      })

      if (!response.ok) {
        let errorData
        try {
          errorData = await response.json()
        } catch {
          if (response.status === 400) {
            customToast({
              variant: "gradient",
              title: "Stripe Account Required",
              description: "You need to connect your Stripe account to sell bundles and receive payments.",
              action: (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10 bg-transparent"
                  onClick={() => window.open("/dashboard/earnings", "_blank")}
                >
                  Connect Stripe
                </Button>
              ),
            })
            return
          }
          throw new Error("Failed to create bundle")
        }

        if (errorData.code === "NO_STRIPE_ACCOUNT" || response.status === 400) {
          customToast({
            variant: "gradient",
            title: "Stripe Account Required",
            description: "You need to connect your Stripe account to sell bundles and receive payments.",
            action: (
              <Button
                size="sm"
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10 bg-transparent"
                onClick={() => window.open("/dashboard/earnings", "_blank")}
              >
                Connect Stripe
              </Button>
            ),
          })
          return
        }

        if (errorData.code === "STRIPE_ACCOUNT_INCOMPLETE") {
          customToast({
            variant: "gradient",
            title: "Complete Stripe Setup",
            description: "Your Stripe account setup is incomplete. Please finish the setup process to start selling.",
            action: (
              <Button
                size="sm"
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10 bg-transparent"
                onClick={() => window.open("/dashboard/earnings", "_blank")}
              >
                Complete Setup
              </Button>
            ),
          })
          return
        }

        customToast({
          variant: "gradient",
          title: "Bundle Creation Failed",
          description: errorData.error || "Unable to create bundle. Please try again.",
        })
        return
      }

      const result = await response.json()
      toast.success("Bundle created successfully!")

      setFormData({
        title: "",
        description: "",
        price: "",
        thumbnailUrl: "",
      })

      onSuccess?.()
    } catch (error) {
      console.error("Error creating bundle:", error)
      customToast({
        variant: "gradient",
        title: "Connection Error",
        description: "Unable to connect to the server. Please check your connection and try again.",
      })
    } finally {
      setLoading(false)
    }
  }

  if (planLoading || stripeStatus.loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading...</div>
        </CardContent>
      </Card>
    )
  }

  const canActuallyCreateBundle = canCreateBundle && stripeStatus.connected && stripeStatus.fullySetup

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Create New Bundle
          <div className="flex gap-2">
            {bundleLimitInfo && (
              <Badge variant={canCreateBundle ? "default" : "destructive"}>
                {bundleLimitInfo.currentCount}/{bundleLimitInfo.maxAllowed || "∞"} bundles
              </Badge>
            )}
            <Badge variant={stripeStatus.connected && stripeStatus.fullySetup ? "default" : "destructive"}>
              {stripeStatus.connected && stripeStatus.fullySetup ? "Stripe Ready" : "Stripe Required"}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {(!stripeStatus.connected || !stripeStatus.fullySetup) && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>
                {!stripeStatus.connected
                  ? "Connect your Stripe account to start selling bundles and receiving payments."
                  : "Complete your Stripe account setup to start selling bundles."}
              </span>
              <Button
                size="sm"
                className="ml-4 bg-blue-600 hover:bg-blue-700"
                onClick={() => window.open("/dashboard/earnings", "_blank")}
              >
                {stripeStatus.connected ? "Complete Setup" : "Connect Stripe"}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {!canCreateBundle && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{bundleLimitInfo?.message}</span>
              {!isProUser && (
                <Button
                  size="sm"
                  className="ml-4 bg-red-600 hover:bg-red-700"
                  onClick={() => window.open("https://buy.stripe.com/14A6oHeWEeJngFv4SzeIw04", "_blank")}
                >
                  <Crown className="w-4 h-4 mr-1" />
                  Upgrade
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium mb-2">
              Bundle Title *
            </label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter bundle title"
              disabled={loading || !canActuallyCreateBundle}
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-2">
              Description *
            </label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe what's included in this bundle"
              rows={3}
              disabled={loading || !canActuallyCreateBundle}
              required
            />
          </div>

          <div>
            <label htmlFor="price" className="block text-sm font-medium mb-2">
              Price (USD) *
            </label>
            <Input
              id="price"
              type="number"
              step="0.01"
              min="0.50"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="9.99"
              disabled={loading || !canActuallyCreateBundle}
              required
            />
          </div>

          <div>
            <label htmlFor="thumbnail" className="block text-sm font-medium mb-2">
              Thumbnail URL (Optional)
            </label>
            <Input
              id="thumbnail"
              type="url"
              value={formData.thumbnailUrl}
              onChange={(e) => setFormData({ ...formData, thumbnailUrl: e.target.value })}
              placeholder="https://example.com/thumbnail.jpg"
              disabled={loading || !canActuallyCreateBundle}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={loading || !canActuallyCreateBundle} className="flex-1">
              {loading ? "Creating..." : "Create Bundle"}
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
                Cancel
              </Button>
            )}
          </div>
        </form>

        {!isProUser && canCreateBundle && (
          <div className="mt-6 p-4 bg-gradient-to-r from-yellow-500/10 to-red-500/10 border border-yellow-500/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="w-5 h-5 text-yellow-500" />
              <span className="font-medium">Upgrade to Creator Pro</span>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Get unlimited bundles, unlimited videos per bundle, and reduced platform fees.
            </p>
            <Button
              size="sm"
              className="bg-red-600 hover:bg-red-700"
              onClick={() => window.open("https://buy.stripe.com/14A6oHeWEeJngFv4SzeIw04", "_blank")}
            >
              <Crown className="w-4 h-4 mr-1" />
              Upgrade Now
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
