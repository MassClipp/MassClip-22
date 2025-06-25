"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { Loader2, Upload, X } from "lucide-react"

interface Bundle {
  id: string
  title: string
  description: string | null
  price: number
  currency: string
  type: string
  coverImage: string | null
  contentItems: string[]
  active: boolean
  customPreviewThumbnail?: string | null
  customPreviewDescription?: string | null
  createdAt: any
  updatedAt: any
}

interface BundlePreviewEditorProps {
  bundle: Bundle
  isOpen: boolean
  onClose: () => void
  onSave: (updatedBundle: Bundle) => void
}

export default function BundlePreviewEditor({ bundle, isOpen, onClose, onSave }: BundlePreviewEditorProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const [formData, setFormData] = useState({
    customPreviewThumbnail: bundle.customPreviewThumbnail || "",
    customPreviewDescription: bundle.customPreviewDescription || "",
  })

  const handleSave = async () => {
    if (!user) return

    try {
      setSaving(true)

      const token = await user.getIdToken()
      const response = await fetch(`/api/creator/bundles/${bundle.id}`, {
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

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update bundle")
      }

      const data = await response.json()
      onSave(data.bundle)

      toast({
        title: "Success",
        description: "Bundle preview settings updated successfully",
      })

      onClose()
    } catch (error) {
      console.error("Error updating bundle preview:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update bundle preview",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleUploadThumbnail = async (file: File) => {
    try {
      setUploading(true)

      const token = await user?.getIdToken()
      const formData = new FormData()
      formData.append("file", file)
      formData.append("bundleId", bundle.id)

      const response = await fetch("/api/upload/bundle-thumbnail", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Failed to upload thumbnail")
      }

      const data = await response.json()
      setFormData((prev) => ({
        ...prev,
        customPreviewThumbnail: data.url,
      }))

      toast({
        title: "Success",
        description: "Thumbnail uploaded successfully",
      })
    } catch (error) {
      console.error("Error uploading thumbnail:", error)
      toast({
        title: "Error",
        description: "Failed to upload thumbnail",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Bundle Preview</DialogTitle>
          <DialogDescription>Customize how your bundle appears to potential customers</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Custom Thumbnail */}
          <div className="space-y-3">
            <Label>Custom Preview Thumbnail</Label>
            <div className="space-y-3">
              {formData.customPreviewThumbnail && (
                <div className="relative">
                  <img
                    src={formData.customPreviewThumbnail || "/placeholder.svg"}
                    alt="Preview thumbnail"
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFormData((prev) => ({ ...prev, customPreviewThumbnail: "" }))}
                    className="absolute top-2 right-2 bg-black/50 hover:bg-black/70"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              <div className="flex gap-3">
                <Input
                  placeholder="Enter thumbnail URL"
                  value={formData.customPreviewThumbnail}
                  onChange={(e) => setFormData((prev) => ({ ...prev, customPreviewThumbnail: e.target.value }))}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleUploadThumbnail(file)
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={uploading}
                  />
                  <Button variant="outline" disabled={uploading} className="border-zinc-700">
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Custom Description */}
          <div className="space-y-3">
            <Label>Custom Preview Description</Label>
            <Textarea
              placeholder="Enter a custom description for the preview (optional)"
              value={formData.customPreviewDescription}
              onChange={(e) => setFormData((prev) => ({ ...prev, customPreviewDescription: e.target.value }))}
              className="bg-zinc-800 border-zinc-700 text-white resize-none"
              rows={4}
            />
            <p className="text-xs text-zinc-500">
              This will override the bundle description in previews. Leave empty to use the original description.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
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
        </div>
      </DialogContent>
    </Dialog>
  )
}
