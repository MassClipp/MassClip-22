"use client"

import type React from "react"
import { useState, useRef } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, X, ImageIcon } from "lucide-react"

interface ProductBox {
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

interface ProductBoxPreviewEditorProps {
  productBox: ProductBox
  isOpen: boolean
  onClose: () => void
  onSave: (updatedProductBox: ProductBox) => void
}

const ProductBoxPreviewEditor: React.FC<ProductBoxPreviewEditorProps> = ({ productBox, isOpen, onClose, onSave }) => {
  const { user } = useAuth()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [formData, setFormData] = useState({
    customPreviewThumbnail: productBox.customPreviewThumbnail || "",
    customPreviewDescription: productBox.customPreviewDescription || "",
  })

  const handleImageUpload = async (file: File) => {
    if (!user) {
      toast({
        title: "Error",
        description: "Please log in to upload thumbnails",
        variant: "destructive",
      })
      return
    }

    try {
      setUploading(true)

      // Create form data for upload
      const uploadFormData = new FormData()
      uploadFormData.append("file", file)
      uploadFormData.append("productBoxId", productBox.id)

      // Get fresh token
      const token = await user.getIdToken(true) // Force refresh
      console.log("🔑 [Thumbnail Upload] Got fresh token")

      const response = await fetch("/api/upload/product-box-thumbnail", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: uploadFormData,
      })

      console.log("📤 [Thumbnail Upload] Response status:", response.status)

      if (!response.ok) {
        const error = await response.json()
        console.error("❌ [Thumbnail Upload] Server error:", error)
        throw new Error(error.error || `Upload failed with status ${response.status}`)
      }

      const data = await response.json()
      console.log("✅ [Thumbnail Upload] Success:", data)

      setFormData((prev) => ({
        ...prev,
        customPreviewThumbnail: data.url,
      }))

      toast({
        title: "Success",
        description: "Thumbnail uploaded successfully",
      })
    } catch (error) {
      console.error("❌ [Thumbnail Upload] Client error:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload thumbnail",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Error",
          description: "Please select an image file",
          variant: "destructive",
        })
        return
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "Image must be less than 5MB",
          variant: "destructive",
        })
        return
      }

      handleImageUpload(file)
    }
  }

  const handleSave = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "Please log in to save changes",
        variant: "destructive",
      })
      return
    }

    try {
      setSaving(true)

      // Get fresh token
      const token = await user.getIdToken(true) // Force refresh
      console.log("🔑 [Save Preview] Got fresh token")

      const response = await fetch(`/api/creator/product-boxes/${productBox.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          customPreviewThumbnail: formData.customPreviewThumbnail || null,
          customPreviewDescription: formData.customPreviewDescription || null,
        }),
      })

      console.log("📤 [Save Preview] Response status:", response.status)

      if (!response.ok) {
        const error = await response.json()
        console.error("❌ [Save Preview] Server error:", error)
        throw new Error(error.error || `Save failed with status ${response.status}`)
      }

      // Update the product box with new data
      const updatedProductBox = {
        ...productBox,
        customPreviewThumbnail: formData.customPreviewThumbnail || null,
        customPreviewDescription: formData.customPreviewDescription || null,
      }

      onSave(updatedProductBox)

      toast({
        title: "Success",
        description: "Preview settings updated successfully",
      })

      onClose()
    } catch (error) {
      console.error("❌ [Save Preview] Client error:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save preview settings",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveThumbnail = () => {
    setFormData((prev) => ({
      ...prev,
      customPreviewThumbnail: "",
    }))
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl">
        <DialogHeader>
          <DialogTitle>Customize Preview</DialogTitle>
          <DialogDescription>Customize how your product box appears to potential customers</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Custom Thumbnail */}
          <div>
            <Label className="text-sm font-medium">Custom Thumbnail</Label>
            <p className="text-xs text-zinc-400 mb-3">Upload a custom thumbnail for your product box preview</p>

            {formData.customPreviewThumbnail ? (
              <div className="relative">
                <img
                  src={formData.customPreviewThumbnail || "/placeholder.svg"}
                  alt="Custom thumbnail"
                  className="w-full h-48 object-cover rounded-lg border border-zinc-700"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveThumbnail}
                  className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-zinc-700 rounded-lg p-8 text-center cursor-pointer hover:border-zinc-600 transition-colors"
              >
                {uploading ? (
                  <div className="flex flex-col items-center">
                    <Loader2 className="h-8 w-8 text-zinc-500 animate-spin mb-2" />
                    <p className="text-sm text-zinc-400">Uploading...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <ImageIcon className="h-8 w-8 text-zinc-500 mb-2" />
                    <p className="text-sm text-zinc-400">Click to upload thumbnail</p>
                    <p className="text-xs text-zinc-500 mt-1">PNG, JPG up to 5MB</p>
                  </div>
                )}
              </div>
            )}

            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
          </div>

          {/* Custom Description */}
          <div>
            <Label htmlFor="customDescription" className="text-sm font-medium">
              Custom Preview Description
            </Label>
            <p className="text-xs text-zinc-400 mb-3">Override the default description for the preview</p>
            <Textarea
              id="customDescription"
              value={formData.customPreviewDescription}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  customPreviewDescription: e.target.value,
                }))
              }
              placeholder="Enter a custom description for the preview..."
              className="bg-zinc-800 border-zinc-700 text-white resize-none"
              rows={4}
            />
          </div>

          {/* Preview */}
          <div>
            <Label className="text-sm font-medium">Preview</Label>
            <div className="mt-2 p-4 bg-zinc-800 rounded-lg border border-zinc-700">
              <div className="flex gap-4">
                <div className="w-20 h-20 bg-zinc-700 rounded-lg overflow-hidden flex-shrink-0">
                  {formData.customPreviewThumbnail || productBox.coverImage ? (
                    <img
                      src={formData.customPreviewThumbnail || productBox.coverImage || ""}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="h-6 w-6 text-zinc-500" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-white">{productBox.title}</h4>
                  <p className="text-sm text-zinc-400 mt-1">
                    {formData.customPreviewDescription || productBox.description || "No description"}
                  </p>
                  <p className="text-sm font-medium text-green-400 mt-2">
                    ${productBox.price.toFixed(2)} {productBox.currency.toUpperCase()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={onClose} className="border-zinc-700">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ProductBoxPreviewEditor
