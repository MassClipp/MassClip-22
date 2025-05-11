"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { formatTags } from "@/lib/upload-utils"
import { db } from "@/lib/firebase"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"
import { toast } from "@/hooks/use-toast"

interface VideoMetadataFormProps {
  videoUrl: string
  videoName: string
  onComplete: () => void
  onCancel: () => void
}

interface FormData {
  title: string
  category: string
  tags: string
  description: string
}

export function VideoMetadataForm({ videoUrl, videoName, onComplete, onCancel }: VideoMetadataFormProps) {
  const [formData, setFormData] = useState<FormData>({
    title: "",
    category: "",
    tags: "",
    description: "",
  })
  const [errors, setErrors] = useState<Partial<FormData>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    // Clear error when field is edited
    if (errors[name as keyof FormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {}

    if (!formData.title.trim()) {
      newErrors.title = "Title is required"
    }

    if (!formData.category.trim()) {
      newErrors.category = "Category is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      // Format tags from comma-separated string to array
      const formattedTags = formatTags(formData.tags)

      // Create document in Firestore
      await addDoc(collection(db, "videos"), {
        title: formData.title,
        category: formData.category,
        tags: formattedTags,
        description: formData.description,
        url: videoUrl,
        filename: videoName,
        uploadedAt: serverTimestamp(),
      })

      toast({
        title: "Success",
        description: "Video metadata saved successfully",
      })

      onComplete()
    } catch (error) {
      console.error("Error saving metadata:", error)
      toast({
        title: "Error",
        description: "Failed to save video metadata",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          placeholder="Enter video title"
          disabled={isSubmitting}
          className={errors.title ? "border-red-500" : ""}
        />
        {errors.title && <p className="text-sm text-red-500">{errors.title}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Category *</Label>
        <Input
          id="category"
          name="category"
          value={formData.category}
          onChange={handleChange}
          placeholder="Enter video category"
          disabled={isSubmitting}
          className={errors.category ? "border-red-500" : ""}
        />
        {errors.category && <p className="text-sm text-red-500">{errors.category}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="tags">Tags (comma-separated)</Label>
        <Input
          id="tags"
          name="tags"
          value={formData.tags}
          onChange={handleChange}
          placeholder="motivation, discipline, success"
          disabled={isSubmitting}
        />
        <p className="text-xs text-gray-500">Separate tags with commas</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description (optional)</Label>
        <Textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Enter video description"
          rows={4}
          disabled={isSubmitting}
        />
      </div>

      <div className="flex justify-end space-x-3">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Metadata"}
        </Button>
      </div>
    </form>
  )
}
