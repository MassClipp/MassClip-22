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

interface BundleCreationFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

export function BundleCreationForm({ onSuccess, onCancel }: BundleCreationFormProps) {
  const { user } = useAuth()
  const { isProUser, loading: planLoading } = useUserPlan()
  const [loading, setLoading] = useState(false)
  const [canCreateBundle, setCanCreateBundle] = useState(true)
  const [bundleLimitInfo, setBundleLimitInfo] = useState<any>(null)

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    thumbnailUrl: "",
  })

  // Check bundle creation limits
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

    if (!canCreateBundle) {
      toast.error("Bundle limit reached. Upgrade to Creator Pro for unlimited bundles.")
      return
    }

    if (!user?.uid) {
      toast.error("You must be logged in to create a bundle")
      return
    }

    if (!formData.title.trim() || !formData.description.trim() || !formData.price) {
      toast.error("Please fill in all required fields")
      return
    }

    setLoading(true)

    try {
      const idToken = await user.getIdToken()

      const response = await fetch("/api/creator/bundles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`, // Added missing auth header
        },
        body: JSON.stringify({
          title: formData.title.trim(),
          description: formData.description.trim(),
          price: Number.parseFloat(formData.price),
          thumbnailUrl: formData.thumbnailUrl.trim() || null,
          contentItems: [], // Added empty content items array
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()

        if (errorData.code === "NO_STRIPE_ACCOUNT") {
          toast.error("Please connect your Stripe account before creating bundles", {
            action: {
              label: "Connect Stripe",
              onClick: () => window.open("/dashboard/stripe-connect", "_blank"),
            },
          })
          return
        }

        if (errorData.code === "STRIPE_ACCOUNT_INCOMPLETE") {
          toast.error("Please complete your Stripe account setup before creating bundles", {
            action: {
              label: "Complete Setup",
              onClick: () => window.open("/dashboard/stripe-connect", "_blank"),
            },
          })
          return
        }

        throw new Error(errorData.error || "Failed to create bundle")
      }

      const result = await response.json()
      toast.success("Bundle created successfully!")

      // Reset form
      setFormData({
        title: "",
        description: "",
        price: "",
        thumbnailUrl: "",
      })

      onSuccess?.()
    } catch (error) {
      console.error("Error creating bundle:", error)
      toast.error(error instanceof Error ? error.message : "Failed to create bundle")
    } finally {
      setLoading(false)
    }
  }

  if (planLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Create New Bundle
          {bundleLimitInfo && (
            <Badge variant={canCreateBundle ? "default" : "destructive"}>
              {bundleLimitInfo.currentCount}/{bundleLimitInfo.maxAllowed || "∞"} bundles
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
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
              disabled={loading || !canCreateBundle}
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
              disabled={loading || !canCreateBundle}
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
              disabled={loading || !canCreateBundle}
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
              disabled={loading || !canCreateBundle}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={loading || !canCreateBundle} className="flex-1">
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
