"use client"

import { DialogTrigger } from "@/components/ui/dialog"

import type React from "react"
import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"
import {
  Loader2,
  Plus,
  Package,
  Trash2,
  DollarSign,
  Eye,
  EyeOff,
  X,
  File,
  Settings,
  CheckCircle,
  AlertCircle,
} from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { motion } from "framer-motion"
import UploadSelector from "@/components/upload-selector"
import BundlePreviewEditor from "@/components/bundle-preview-editor"
import UserProfileDiagnostic from "@/components/user-profile-diagnostic"

interface Bundle {
  id: string
  title: string
  description: string | null
  price: number
  currency: string
  type: string
  coverImage: string | null
  contentItems: string[]
  productId: string | null
  priceId: string | null
  active: boolean
  createdAt: any
  updatedAt: any
  customPreviewThumbnail?: string | null
  customPreviewDescription?: string | null
  stripeError?: string | null
}

interface BundleCreationError {
  code: string
  message: string
  details?: string
  suggestedActions: string[]
}

interface SuccessResponse {
  success: boolean
  bundle: Bundle
  stripe: {
    productId: string | null
    priceId: string | null
  }
  message: string
}

export default function BundlesPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [bundles, setBundles] = useState<Bundle[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [bulkSyncing, setBulkSyncing] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isContentDialogOpen, setIsContentDialogOpen] = useState(false)
  const [selectedBox, setSelectedBox] = useState<Bundle | null>(null)
  const [addingContent, setAddingContent] = useState(false)
  const [error, setError] = useState<BundleCreationError | null>(null)
  const [success, setSuccess] = useState<SuccessResponse | null>(null)
  const [contentVideos, setContentVideos] = useState<{ [key: string]: any[] }>({})

  // Add state for preview editor
  const [previewEditorOpen, setPreviewEditorOpen] = useState(false)
  const [selectedBoxForPreview, setSelectedBoxForPreview] = useState<Bundle | null>(null)

  // Add state for price editing
  const [editingPrice, setEditingPrice] = useState<string | null>(null)
  const [newPrice, setNewPrice] = useState("")
  const [updatingPrice, setUpdatingPrice] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    currency: "usd",
    type: "one_time",
    coverImage: "",
  })

  // Fetch bundles
  const fetchBundles = async () => {
    if (!user) {
      console.log("❌ [Bundles] No user available for fetching")
      return
    }

    try {
      setLoading(true)
      console.log("🔍 [Bundles] Starting fetch for user:", user.uid)

      const token = await user.getIdToken()
      console.log("✅ [Bundles] Got auth token")

      const response = await fetch("/api/creator/bundles", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      console.log("📡 [Bundles] Response status:", response.status)

      if (!response.ok) {
        const error = await response.json()
        console.error("❌ [Bundles] API Error:", error)
        throw new Error(error.error || `HTTP ${response.status}: Failed to fetch bundles`)
      }

      const data = await response.json()
      const boxes = Array.isArray(data.bundles) ? data.bundles.filter((box: Bundle) => box.active) : []

      // Sort by creation date (newest first) - add null checks
      boxes.sort((a: Bundle, b: Bundle) => {
        if (!a.createdAt?.seconds || !b.createdAt?.seconds) return 0
        return b.createdAt.seconds - a.createdAt.seconds
      })

      setBundles(boxes)
      console.log(`✅ [Bundles] Loaded ${boxes.length} bundles`)

      // Fetch content for each bundle - add null check
      if (boxes.length > 0) {
        boxes.forEach((bundle: Bundle) => {
          fetchBundleContent(bundle)
        })
      }
    } catch (error) {
      console.error("❌ [Bundles] Fetch error:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load bundles",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchBundleContent = async (bundle: Bundle) => {
    if (!bundle.contentItems || bundle.contentItems.length === 0) {
      setContentVideos((prev) => ({ ...prev, [bundle.id]: [] }))
      return
    }

    try {
      const videos = await Promise.all(
        bundle.contentItems.map(async (uploadId) => {
          const response = await fetch(`/api/creator/uploads/${uploadId}`)
          if (!response.ok) {
            console.error(`Failed to fetch upload ${uploadId}: ${response.status}`)
            return null
          }
          return await response.json()
        }),
      )

      const validVideos = videos.filter((video) => video !== null)
      setContentVideos((prev) => ({ ...prev, [bundle.id]: validVideos }))
    } catch (error) {
      console.error("Error fetching content videos:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load content videos",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    if (user) {
      fetchBundles()
    }
  }, [user])

  // Create bundle
  const handleCreateBundle = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!formData.title || !formData.price || !user) {
      toast({
        title: "Error",
        description: "Title, price, and authentication are required",
        variant: "destructive",
      })
      return
    }

    try {
      setCreating(true)
      const token = await user.getIdToken()

      console.log("🔍 [Bundles] Creating bundle:", formData.title)

      const response = await fetch("/api/creator/bundles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          price: Number.parseFloat(formData.price),
          currency: formData.currency,
          type: formData.type,
          coverImage: formData.coverImage || null,
          contentItems: [],
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data as BundleCreationError)
        return
      }

      console.log("✅ [Bundles] Created successfully:", data.bundle)
      setSuccess(data as SuccessResponse)
      setBundles([data.bundle, ...bundles])

      // Reset form
      setFormData({
        title: "",
        description: "",
        price: "",
        currency: "usd",
        type: "one_time",
        coverImage: "",
      })

      toast({
        title: "Success!",
        description: data.message,
      })

      // Auto-close dialog after success
      setTimeout(() => {
        setIsDialogOpen(false)
        setSuccess(null)
      }, 3000)
    } catch (error) {
      console.error("Error creating bundle:", error)
      setError({
        code: "NETWORK_ERROR",
        message: "Failed to create bundle",
        details: "Please check your internet connection and try again",
        suggestedActions: [
          "Check your internet connection",
          "Try again in a few moments",
          "Contact support if the issue persists",
        ],
      })
    } finally {
      setCreating(false)
    }
  }

  // Add content to bundle
  const handleAddContent = async (uploadIds: string[]) => {
    if (!selectedBox || uploadIds.length === 0 || !user) return

    try {
      setAddingContent(true)
      console.log(`🔍 [Bundles] Adding ${uploadIds.length} uploads to bundle:`, selectedBox.id)

      const token = await user.getIdToken()
      const response = await fetch(`/api/creator/bundles/${selectedBox.id}/content`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ uploadIds }),
      })

      if (!response.ok) {
        const error = await response.json()
        console.error("❌ [Bundles] API Error:", error)
        throw new Error(error.error || "Failed to add content")
      }

      const data = await response.json()
      console.log("✅ [Bundles] Content added successfully:", data)

      // Update the bundle in state
      setBundles(bundles.map((box) => (box.id === selectedBox.id ? { ...box, contentItems: data.contentItems } : box)))

      setIsContentDialogOpen(false)
      setSelectedBox(null)

      toast({
        title: "Success!",
        description: `Added ${data.addedCount || uploadIds.length} upload${uploadIds.length > 1 ? "s" : ""} to bundle`,
      })
    } catch (error) {
      console.error("❌ [Bundles] Error adding content:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add content",
        variant: "destructive",
      })
    } finally {
      setAddingContent(false)
    }
  }

  // Remove content from bundle
  const handleRemoveContent = async (bundle: Bundle, videoId: string) => {
    if (!user) return

    try {
      const token = await user.getIdToken()
      const response = await fetch(`/api/creator/bundles/${bundle.id}/content`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ videoId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to remove content")
      }

      const data = await response.json()

      // Update the bundle in state
      setBundles(bundles.map((box) => (box.id === bundle.id ? { ...box, contentItems: data.contentItems } : box)))

      toast({
        title: "Success!",
        description: "Content removed from bundle",
      })
    } catch (error) {
      console.error("Error removing content:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to remove content",
        variant: "destructive",
      })
    }
  }

  // Toggle bundle status
  const toggleBundleStatus = async (bundle: Bundle) => {
    if (!user) return

    try {
      const token = await user.getIdToken()
      const response = await fetch(`/api/creator/bundles/${bundle.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          active: !bundle.active,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update bundle")
      }

      const data = await response.json()
      setBundles(bundles.map((box) => (box.id === bundle.id ? { ...box, active: !bundle.active } : box)))

      toast({
        title: "Success",
        description: `Bundle ${!bundle.active ? "activated" : "deactivated"}`,
      })
    } catch (error) {
      console.error("Error updating bundle:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update bundle",
        variant: "destructive",
      })
    }
  }

  // Delete bundle
  const deleteBundle = async (bundle: Bundle) => {
    if (!confirm("Are you sure you want to delete this bundle? This action cannot be undone.")) {
      return
    }

    try {
      const token = await user.getIdToken()
      const response = await fetch(`/api/creator/bundles/${bundle.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to delete bundle")
      }

      setBundles(bundles.filter((box) => box.id !== bundle.id))

      toast({
        title: "Success",
        description: "Bundle deleted successfully",
      })
    } catch (error) {
      console.error("Error deleting bundle:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete bundle",
        variant: "destructive",
      })
    }
  }

  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount)
  }

  const openStripeProduct = (productId: string | null) => {
    if (productId) {
      window.open(`https://dashboard.stripe.com/products/${productId}`, "_blank")
    }
  }

  // Content selection dialog
  const ContentSelectionDialog = () => {
    return (
      <Dialog open={isContentDialogOpen} onOpenChange={setIsContentDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Content to {selectedBox?.title}</DialogTitle>
            <DialogDescription>Select uploads from your content library to add to this bundle</DialogDescription>
          </DialogHeader>

          <UploadSelector
            excludeIds={selectedBox?.contentItems || []}
            onSelect={(uploadIds) => handleAddContent(uploadIds)}
            onCancel={() => {
              setIsContentDialogOpen(false)
              setSelectedBox(null)
            }}
            loading={addingContent}
          />
        </DialogContent>
      </Dialog>
    )
  }

  // Add function to handle preview editor
  const handleOpenPreviewEditor = (bundle: Bundle) => {
    setSelectedBoxForPreview(bundle)
    setPreviewEditorOpen(true)
  }

  const handleSavePreviewSettings = (updatedBundle: Bundle) => {
    setBundles(bundles.map((box) => (box.id === updatedBundle.id ? updatedBundle : box)))
    setPreviewEditorOpen(false)
    setSelectedBoxForPreview(null)
  }

  const unsyncedCount = bundles.filter((box) => !box.productId).length

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 text-zinc-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bundles</h1>
          <p className="text-zinc-400 mt-1">Create and manage premium content bundles for your audience</p>
        </div>

        <div className="flex gap-3">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800">
                <Plus className="h-4 w-4 mr-2" />
                Create Bundle
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Bundle</DialogTitle>
                <DialogDescription>
                  Create a new premium content bundle that will automatically sync with your Stripe account.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleCreateBundle} className="space-y-6">
                {success && (
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      <div className="space-y-3">
                        <div className="font-medium">{success.message}</div>
                        {success.stripe.productId && (
                          <div className="text-sm space-y-2">
                            <div className="font-medium">Stripe Integration Details:</div>
                            <div className="bg-green-100 p-3 rounded space-y-1">
                              <div className="flex items-center justify-between">
                                <span>Product ID:</span>
                                <code className="bg-green-200 px-2 py-1 rounded text-xs">
                                  {success.stripe.productId}
                                </code>
                              </div>
                              <div className="flex items-center justify-between">
                                <span>Price ID:</span>
                                <code className="bg-green-200 px-2 py-1 rounded text-xs">{success.stripe.priceId}</code>
                              </div>
                            </div>
                            <div className="text-xs text-green-700">
                              ✅ Product successfully created in your Stripe account and ready for purchases
                            </div>
                          </div>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {error && (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      <div className="space-y-2">
                        <div className="font-medium">{error.message}</div>
                        {error.details && <div className="text-sm text-red-700">{error.details}</div>}
                        {error.code && <div className="text-xs text-red-600 font-mono">Error Code: {error.code}</div>}
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

                <div>
                  <Label htmlFor="title">Bundle Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Exclusive Video Collection"
                    className="bg-zinc-800 border-zinc-700 text-white mt-1.5"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Access to my premium video collection with behind-the-scenes content..."
                    className="bg-zinc-800 border-zinc-700 text-white mt-1.5 resize-none"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="price">Price (USD)</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0.50"
                      max="999.99"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="19.99"
                      className="bg-zinc-800 border-zinc-700 text-white mt-1.5"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="type">Billing Type</Label>
                    <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                      <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-800 border-zinc-700">
                        <SelectItem value="one_time">One-time Payment</SelectItem>
                        <SelectItem value="subscription">Monthly Subscription</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="coverImage">Cover Image URL (Optional)</Label>
                  <Input
                    id="coverImage"
                    value={formData.coverImage}
                    onChange={(e) => setFormData({ ...formData, coverImage: e.target.value })}
                    placeholder="https://example.com/cover-image.jpg"
                    className="bg-zinc-800 border-zinc-700 text-white mt-1.5"
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false)
                      setError(null)
                      setSuccess(null)
                      setFormData({
                        title: "",
                        description: "",
                        price: "",
                        currency: "usd",
                        type: "one_time",
                        coverImage: "",
                      })
                    }}
                    className="border-zinc-700"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={creating}
                    className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
                  >
                    {creating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating & Syncing...
                      </>
                    ) : (
                      "Create Bundle"
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Add diagnostic component for debugging */}
      {process.env.NODE_ENV === "development" && (
        <div className="mb-6">
          <UserProfileDiagnostic />
        </div>
      )}

      {bundles.length === 0 ? (
        <Card className="bg-zinc-900/60 border-zinc-800/50 backdrop-blur-sm">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Package className="h-12 w-12 text-zinc-600 mb-4" />
            <h3 className="text-xl font-medium text-white mb-2">No Bundles Yet</h3>
            <p className="text-zinc-400 text-center mb-6 max-w-md">
              Create your first bundle to organize your premium content into packages that visitors can purchase.
            </p>
            <Button
              onClick={() => setIsDialogOpen(true)}
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Bundle
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {bundles.map((bundle, index) => (
            <motion.div
              key={bundle.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Card className="bg-zinc-900/60 border-zinc-800/50 backdrop-blur-sm hover:border-zinc-700/50 transition-all duration-300">
                {bundle.coverImage && (
                  <div className="aspect-video bg-zinc-800 rounded-t-lg overflow-hidden">
                    <img
                      src={bundle.coverImage || "/placeholder.svg"}
                      alt={bundle.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg text-white">{bundle.title}</CardTitle>
                      {bundle.description && (
                        <CardDescription className="mt-1 text-zinc-400">{bundle.description}</CardDescription>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <Badge variant={bundle.active ? "default" : "secondary"} className="text-xs">
                        {bundle.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center text-2xl font-bold text-white">
                          <DollarSign className="h-5 w-5 text-green-500 mr-1" />
                          {formatPrice(bundle.price, bundle.currency)}
                        </div>
                      </div>
                      {bundle.type === "subscription" && (
                        <Badge variant="outline" className="text-xs border-zinc-700">
                          /month
                        </Badge>
                      )}
                    </div>

                    {/* Content Items */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-400">Content ({bundle.contentItems?.length || 0})</span>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedBox(bundle)
                              setIsContentDialogOpen(true)
                            }}
                            className="text-xs border-zinc-700 hover:bg-zinc-800"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add
                          </Button>
                        </div>
                      </div>

                      {(bundle.contentItems || []).length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {(bundle.contentItems || []).slice(0, 3).map((uploadId, index) => (
                            <div
                              key={uploadId}
                              className="group relative bg-zinc-800 rounded px-2 py-1 text-xs text-zinc-300 flex items-center gap-1"
                            >
                              <File className="h-3 w-3" />
                              <span className="truncate max-w-[80px]">Upload {index + 1}</span>
                              <button
                                onClick={() => handleRemoveContent(bundle, uploadId)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 text-red-400 hover:text-red-300"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                          {(bundle.contentItems || []).length > 3 && (
                            <div className="bg-zinc-800 rounded px-2 py-1 text-xs text-zinc-400">
                              +{(bundle.contentItems || []).length - 3} more
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={bundle.active}
                          onCheckedChange={() => toggleBundleStatus(bundle)}
                          className="data-[state=checked]:bg-green-600"
                        />
                        <span className="text-sm text-zinc-400">
                          {bundle.active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenPreviewEditor(bundle)}
                          className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/20"
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteBundle(bundle)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <ContentSelectionDialog />
      {selectedBoxForPreview && (
        <BundlePreviewEditor
          bundle={selectedBoxForPreview}
          isOpen={previewEditorOpen}
          onClose={() => {
            setPreviewEditorOpen(false)
            setSelectedBoxForPreview(null)
          }}
          onSave={handleSavePreviewSettings}
        />
      )}
    </div>
  )
}
