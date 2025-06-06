"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle, CheckCircle, XCircle, ExternalLink } from "lucide-react"

interface ProductBoxCreationError {
  code: string
  message: string
  details?: string
  suggestedActions: string[]
}

interface ProductBoxFormData {
  title: string
  price: string
  currency: string
  type: string
  coverImage: string
  contentItems: string[]
}

interface SuccessResponse {
  success: boolean
  productBox: any
  stripe: {
    productId: string
    priceId: string
  }
  message: string
}

export default function ProductBoxCreationForm({ onSuccess }: { onSuccess?: () => void }) {
  const [formData, setFormData] = useState<ProductBoxFormData>({
    title: "",
    price: "",
    currency: "usd",
    type: "one_time",
    coverImage: "",
    contentItems: [],
  })

  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<ProductBoxCreationError | null>(null)
  const [success, setSuccess] = useState<SuccessResponse | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!formData.title.trim()) {
      errors.title = "Title is required"
    } else if (formData.title.trim().length > 100) {
      errors.title = "Title must be 100 characters or less"
    }

    if (!formData.price) {
      errors.price = "Price is required"
    } else {
      const price = Number.parseFloat(formData.price)
      if (isNaN(price)) {
        errors.price = "Please enter a valid price"
      } else if (price < 0.5) {
        errors.price = "Price must be at least $0.50"
      } else if (price > 999.99) {
        errors.price = "Price cannot exceed $999.99"
      }
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsCreating(true)
    setError(null)
    setSuccess(null)

    try {
      console.log("🔍 [Product Box Form] Submitting form data:", formData)

      const response = await fetch("/api/creator/product-boxes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Important for session cookies
        body: JSON.stringify({
          title: formData.title.trim(),
          price: Number.parseFloat(formData.price),
          currency: formData.currency,
          type: formData.type,
          coverImage: formData.coverImage.trim() || null,
          contentItems: formData.contentItems,
        }),
      })

      console.log("📡 [Product Box Form] Response status:", response.status)

      const data = await response.json()
      console.log("📦 [Product Box Form] Response data:", data)

      if (!response.ok) {
        // Handle specific error codes
        if (response.status === 401) {
          setError({
            code: "AUTHENTICATION_REQUIRED",
            message: "Please log in to create product boxes",
            suggestedActions: ["Log out and log back in", "Refresh the page", "Clear your browser cache"],
          })
          return
        }

        setError(data as ProductBoxCreationError)
        return
      }

      setSuccess(data as SuccessResponse)
      setFormData({
        title: "",
        price: "",
        currency: "usd",
        type: "one_time",
        coverImage: "",
        contentItems: [],
      })

      if (onSuccess) {
        setTimeout(() => onSuccess(), 2000) // Give user time to see success message
      }
    } catch (err) {
      console.error("❌ [Product Box Form] Network error:", err)
      setError({
        code: "NETWORK_ERROR",
        message: "Failed to create product box",
        details: "Please check your internet connection and try again",
        suggestedActions: [
          "Check your internet connection",
          "Try again in a few moments",
          "Contact support if the issue persists",
        ],
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleInputChange = (field: keyof ProductBoxFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))

    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Create Product Box</CardTitle>
        <CardDescription>Create a premium content package that customers can purchase</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Success Message */}
          {success && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <div className="font-medium">{success.message}</div>
              </AlertDescription>
            </Alert>
          )}

          {/* Error Message */}
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <XCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <div className="space-y-2">
                  <div className="font-medium">{error.message}</div>
                  {error.details && <div className="text-sm text-red-700">{error.details}</div>}
                  {error.code && <div className="text-xs text-red-600 font-mono">Error Code: {error.code}</div>}

                  {/* Stripe-specific error guidance */}
                  {error.code?.includes("STRIPE") && (
                    <div className="text-xs bg-red-100 p-2 rounded">
                      <div className="font-medium">Stripe Integration Issue</div>
                      <div>This error occurred during Stripe API communication</div>
                      {error.code === "NO_STRIPE_ACCOUNT" && (
                        <div className="mt-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open("/dashboard/settings/stripe", "_blank")}
                            className="text-xs"
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Connect Stripe Account
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {error.suggestedActions && error.suggestedActions.length > 0 && (
                    <div className="text-sm">
                      <div className="font-medium mb-1">Suggested actions:</div>
                      <ul className="list-disc list-inside space-y-1">
                        {error.suggestedActions.map((action, index) => (
                          <li key={index}>{action}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Product Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange("title", e.target.value)}
              placeholder="Enter product title (max 100 characters)"
              maxLength={100}
              className={validationErrors.title ? "border-red-500" : ""}
            />
            {validationErrors.title && <p className="text-sm text-red-600">{validationErrors.title}</p>}
            <p className="text-sm text-gray-500">{formData.title.length}/100 characters</p>
          </div>

          {/* Price and Currency */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0.50"
                max="999.99"
                value={formData.price}
                onChange={(e) => handleInputChange("price", e.target.value)}
                placeholder="9.99"
                className={validationErrors.price ? "border-red-500" : ""}
              />
              {validationErrors.price && <p className="text-sm text-red-600">{validationErrors.price}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select value={formData.currency} onValueChange={(value) => handleInputChange("currency", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="usd">USD ($)</SelectItem>
                  <SelectItem value="eur">EUR (€)</SelectItem>
                  <SelectItem value="gbp">GBP (£)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Billing Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Billing Type</Label>
            <Select value={formData.type} onValueChange={(value) => handleInputChange("type", value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="one_time">One-time Payment</SelectItem>
                <SelectItem value="subscription">Monthly Subscription</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Cover Image */}
          <div className="space-y-2">
            <Label htmlFor="coverImage">Cover Image URL</Label>
            <Input
              id="coverImage"
              type="url"
              value={formData.coverImage}
              onChange={(e) => handleInputChange("coverImage", e.target.value)}
              placeholder="https://example.com/image.jpg"
            />
          </div>

          {/* Submit Button */}
          <Button type="submit" disabled={isCreating} className="w-full">
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Product Box & Syncing with Stripe...
              </>
            ) : (
              "Create Product Box"
            )}
          </Button>

          {/* Info */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <div>
                  When you create a product box, we'll automatically set up the corresponding product in your Stripe
                  account. Make sure your Stripe account is fully set up and can accept payments.
                </div>
                <div className="text-xs text-gray-600">
                  <strong>What happens:</strong> Product created in Stripe → Price created → Data saved to database →
                  Ready for purchases
                </div>
              </div>
            </AlertDescription>
          </Alert>
        </form>
      </CardContent>
    </Card>
  )
}
