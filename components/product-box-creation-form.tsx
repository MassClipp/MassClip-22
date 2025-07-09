"use client"

import type React from "react"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Upload, X, DollarSign, Info, AlertTriangle } from "lucide-react"
import { toast } from "@/hooks/use-toast"

// Stripe minimum charge amounts by currency
const STRIPE_MINIMUMS = {
  usd: { amount: 0.5, symbol: "$", name: "USD" },
  eur: { amount: 0.5, symbol: "€", name: "EUR" },
  gbp: { amount: 0.3, symbol: "£", name: "GBP" },
  cad: { amount: 0.5, symbol: "C$", name: "CAD" },
  aud: { amount: 0.5, symbol: "A$", name: "AUD" },
} as const

interface ProductBoxCreationFormProps {
  onSuccess?: (productBoxId: string) => void
  onCancel?: () => void
}

export default function ProductBoxCreationForm({ onSuccess, onCancel }: ProductBoxCreationFormProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)

  // Form state
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [price, setPrice] = useState("")
  const [currency, setCurrency] = useState<keyof typeof STRIPE_MINIMUMS>("usd")
  const [category, setCategory] = useState("")

  // Get current currency info
  const currentCurrency = STRIPE_MINIMUMS[currency]
  const minimumPrice = currentCurrency.amount
  const priceNumber = Number.parseFloat(price) || 0

  // Validation
  const isPriceValid = priceNumber >= minimumPrice
  const isFormValid = title.trim() && description.trim() && isPriceValid && selectedFiles.length > 0

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    setSelectedFiles((prev) => [...prev, ...files])
  }

  const handleThumbnailSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setThumbnailFile(file)
      const reader = new FileReader()
      reader.onload = (e) => setThumbnailPreview(e.target?.result as string)
      reader.readAsDataURL(file)
    }
  }

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const removeThumbnail = () => {
    setThumbnailFile(null)
    setThumbnailPreview(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user || !isFormValid) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields correctly",
        variant: "destructive",
      })
      return
    }

    if (priceNumber < minimumPrice) {
      toast({
        title: "Price Too Low",
        description: `Minimum price for ${currentCurrency.name} is ${currentCurrency.symbol}${minimumPrice}`,
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      const idToken = await user.getIdToken()

      // Create the product box first
      const productBoxResponse = await fetch("/api/creator/product-boxes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          price: priceNumber,
          currency: currency,
          category: category.trim() || "general",
          active: true,
        }),
      })

      if (!productBoxResponse.ok) {
        const error = await productBoxResponse.json()
        throw new Error(error.error || "Failed to create product box")
      }

      const { productBoxId } = await productBoxResponse.json()

      // Upload thumbnail if provided
      let thumbnailUrl = null
      if (thumbnailFile) {
        setUploading(true)
        const thumbnailFormData = new FormData()
        thumbnailFormData.append("file", thumbnailFile)
        thumbnailFormData.append("productBoxId", productBoxId)

        const thumbnailResponse = await fetch("/api/upload/product-box-thumbnail", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
          body: thumbnailFormData,
        })

        if (thumbnailResponse.ok) {
          const thumbnailResult = await thumbnailResponse.json()
          thumbnailUrl = thumbnailResult.url
        }
      }

      // Upload content files
      const uploadPromises = selectedFiles.map(async (file) => {
        const formData = new FormData()
        formData.append("file", file)
        formData.append("productBoxId", productBoxId)
        formData.append("title", file.name)

        const response = await fetch("/api/upload/product-box-content", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
          body: formData,
        })

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`)
        }

        return response.json()
      })

      await Promise.all(uploadPromises)

      // Update product box with thumbnail if uploaded
      if (thumbnailUrl) {
        await fetch(`/api/creator/product-boxes/${productBoxId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            thumbnailUrl,
          }),
        })
      }

      toast({
        title: "Success!",
        description: "Product box created successfully",
      })

      onSuccess?.(productBoxId)
    } catch (error: any) {
      console.error("Error creating product box:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to create product box",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setUploading(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Create Product Box</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter product box title"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what's included in this product box"
                rows={3}
                required
              />
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g., Photography, Design, Music"
              />
            </div>
          </div>

          {/* Pricing */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="currency">Currency *</Label>
                <Select value={currency} onValueChange={(value: keyof typeof STRIPE_MINIMUMS) => setCurrency(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STRIPE_MINIMUMS).map(([code, info]) => (
                      <SelectItem key={code} value={code}>
                        {info.symbol} {info.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="price">Price *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min={minimumPrice}
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder={`Min: ${currentCurrency.symbol}${minimumPrice}`}
                    className="pl-10"
                    required
                  />
                </div>
                {!isPriceValid && price && (
                  <p className="text-sm text-red-600 mt-1">
                    Minimum price is {currentCurrency.symbol}
                    {minimumPrice}
                  </p>
                )}
              </div>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Stripe Minimum Requirements:</strong>
                <ul className="mt-2 space-y-1 text-sm">
                  <li>• USD: $0.50 minimum</li>
                  <li>• EUR: €0.50 minimum</li>
                  <li>• GBP: £0.30 minimum</li>
                  <li>• CAD/AUD: $0.50 minimum</li>
                </ul>
                <p className="mt-2 text-xs text-gray-600">
                  These minimums are set by Stripe to cover processing costs and cannot be overridden.
                </p>
              </AlertDescription>
            </Alert>
          </div>

          {/* Thumbnail Upload */}
          <div>
            <Label>Thumbnail (Optional)</Label>
            <div className="mt-2">
              {thumbnailPreview ? (
                <div className="relative inline-block">
                  <img
                    src={thumbnailPreview || "/placeholder.svg"}
                    alt="Thumbnail preview"
                    className="w-32 h-32 object-cover rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                    onClick={removeThumbnail}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-2">
                    <label htmlFor="thumbnail-upload" className="cursor-pointer">
                      <span className="text-sm text-blue-600 hover:text-blue-500">Upload thumbnail</span>
                      <input
                        id="thumbnail-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleThumbnailSelect}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 10MB</p>
                </div>
              )}
            </div>
          </div>

          {/* Content Files */}
          <div>
            <Label>Content Files *</Label>
            <div className="mt-2">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="mt-2">
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <span className="text-sm text-blue-600 hover:text-blue-500">Upload files</span>
                    <input
                      id="file-upload"
                      type="file"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                      accept="video/*,image/*,audio/*,.pdf,.zip,.rar"
                    />
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-1">Videos, images, audio, PDFs, archives</p>
              </div>

              {selectedFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  <Label>Selected Files ({selectedFiles.length})</Label>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{file.name}</p>
                          <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          className="ml-2 h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Price Validation Warning */}
          {!isPriceValid && price && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                The price must be at least {currentCurrency.symbol}
                {minimumPrice} for {currentCurrency.name} due to Stripe's minimum charge requirements.
              </AlertDescription>
            </Alert>
          )}

          {/* Form Actions */}
          <div className="flex gap-4 pt-4">
            <Button type="submit" disabled={!isFormValid || loading || uploading} className="flex-1">
              {loading || uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {uploading ? "Uploading..." : "Creating..."}
                </>
              ) : (
                "Create Product Box"
              )}
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} disabled={loading || uploading}>
                Cancel
              </Button>
            )}
          </div>

          {/* Form Summary */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Summary</h4>
            <div className="space-y-1 text-sm text-gray-600">
              <p>
                <strong>Title:</strong> {title || "Not set"}
              </p>
              <p>
                <strong>Price:</strong> {currentCurrency.symbol}
                {price || "0.00"} {currentCurrency.name}
              </p>
              <p>
                <strong>Files:</strong> {selectedFiles.length} selected
              </p>
              <p>
                <strong>Thumbnail:</strong> {thumbnailFile ? "Selected" : "None"}
              </p>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
