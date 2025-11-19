"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  orderBy,
  Timestamp,
} from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Trash2, Plus, ExternalLink, Edit, Package, Loader2 } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { formatFileSize, formatDuration } from "@/lib/format-utils"

interface ProductBox {
  id: string
  name: string
  description: string
  price: number
  creatorId: string
  active: boolean
  contentItems: string[]
  createdAt: Date
  updatedAt: Date
  detailedContentItems?: any[]
  contentMetadata?: any
}

interface ContentItem {
  id: string
  title: string
  contentType: string
  thumbnailUrl?: string
  duration?: number
  fileSize?: number
  format?: string
}

export default function BundlesPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [productBoxes, setProductBoxes] = useState<ProductBox[]>([])
  const [contentItems, setContentItems] = useState<Record<string, ContentItem[]>>({})
  const [loading, setLoading] = useState(true)
  const [freeTierLimits, setFreeTierLimits] = useState<any>(null)

  useEffect(() => {
    if (!user) return

    const fetchFreeTierLimits = async () => {
      try {
        const response = await fetch("/api/user/free-tier-limits")
        if (response.ok) {
          const data = await response.json()
          setFreeTierLimits(data)
        }
      } catch (error) {
        console.error("Error fetching free tier limits:", error)
      }
    }

    fetchFreeTierLimits()
  }, [user])

  const fetchProductBoxes = async () => {
    if (!user) return

    try {
      const idToken = await user.getIdToken()
      const response = await fetch("/api/creator/bundles", {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      })

      if (!response.ok) throw new Error("Failed to fetch bundles")

      const data = await response.json()
      const boxesWithDates = data.productBoxes.map((box: any) => ({
        ...box,
        createdAt: box.createdAt?.toDate ? box.createdAt.toDate() : new Date(box.createdAt),
        updatedAt: box.updatedAt?.toDate ? box.updatedAt.toDate() : new Date(box.updatedAt),
      }))

      setProductBoxes(boxesWithDates)
      setLoading(false)
    } catch (error) {
      console.error("Error fetching product boxes:", error)
      toast({
        title: "Error",
        description: "Failed to load bundles",
        variant: "destructive",
      })
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProductBoxes()
  }, [user])

  const handleToggleActive = async (productBoxId: string) => {
    try {
      const productBox = productBoxes.find((box) => box.id === productBoxId)
      if (!productBox) return

      const newActiveStatus = !productBox.active

      setProductBoxes((prev) =>
        prev.map((box) => (box.id === productBoxId ? { ...box, active: newActiveStatus } : box)),
      )

      const idToken = await user?.getIdToken()
      const response = await fetch(`/api/creator/bundles/${productBoxId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          active: newActiveStatus,
        }),
      })

      if (!response.ok) {
        setProductBoxes((prev) =>
          prev.map((box) => (box.id === productBoxId ? { ...box, active: !newActiveStatus } : box)),
        )
        throw new Error("Failed to update bundle status")
      }

      toast({
        title: "Success",
        description: `Bundle ${newActiveStatus ? "activated" : "deactivated"}`,
      })
    } catch (error) {
      console.error("Error toggling active status:", error)
      toast({
        title: "Error",
        description: "Failed to update bundle status",
        variant: "destructive",
      })
    }
  }

  const handleRemoveContentFromBundle = async (productBoxId: string, contentId: string) => {
    if (!confirm("Remove this content from the bundle?")) return

    try {
      const currentBox = productBoxes.find((box) => box.id === productBoxId)
      if (!currentBox) return

      const updatedContentItems = currentBox.contentItems.filter((id) => id !== contentId)

      setProductBoxes((prev) =>
        prev.map((box) => (box.id === productBoxId ? { ...box, contentItems: updatedContentItems } : box)),
      )

      setContentItems((prev) => ({
        ...prev,
        [productBoxId]: prev[productBoxId]?.filter((item) => item.id !== contentId) || [],
      }))

      const contentQuery1 = query(
        collection(db, "productBoxContent"),
        where("productBoxId", "==", productBoxId),
        where("uploadId", "==", contentId),
      )
      const contentQuery2 = query(collection(db, "productBoxContent"), where("productBoxId", "==", productBoxId))

      const [contentSnapshot1, contentSnapshot2] = await Promise.all([getDocs(contentQuery1), getDocs(contentQuery2)])

      const deletePromises: Promise<void>[] = []

      contentSnapshot1.docs.forEach((docSnapshot) => {
        deletePromises.push(deleteDoc(docSnapshot.ref))
      })

      contentSnapshot2.docs.forEach((docSnapshot) => {
        const data = docSnapshot.data()
        if (docSnapshot.id === contentId || data.uploadId === contentId) {
          deletePromises.push(deleteDoc(docSnapshot.ref))
        }
      })

      await Promise.all(deletePromises)

      const remainingDetailedItems = (currentBox.detailedContentItems || []).filter(
        (item: any) => item.id !== contentId,
      )
      const totalDuration = remainingDetailedItems.reduce((sum: number, item: any) => sum + (item.duration || 0), 0)
      const totalSize = remainingDetailedItems.reduce((sum: number, item: any) => sum + (item.fileSize || 0), 0)
      const videoCount = remainingDetailedItems.filter((item: any) => item.contentType === "video").length
      const audioCount = remainingDetailedItems.filter((item: any) => item.contentType === "audio").length
      const imageCount = remainingDetailedItems.filter((item: any) => item.contentType === "image").length
      const documentCount = remainingDetailedItems.filter((item: any) => item.contentType === "document").length

      await updateDoc(doc(db, "bundles", productBoxId), {
        contentItems: updatedContentItems,
        detailedContentItems: remainingDetailedItems,
        contentMetadata: {
          totalItems: remainingDetailedItems.length,
          totalDuration: totalDuration,
          totalDurationFormatted: formatDuration(totalDuration),
          totalSize: totalSize,
          totalSizeFormatted: formatFileSize(totalSize),
          contentBreakdown: {
            videos: videoCount,
            audio: audioCount,
            images: imageCount,
            documents: documentCount,
          },
          averageDuration: remainingDetailedItems.length > 0 ? totalDuration / remainingDetailedItems.length : 0,
          averageSize: remainingDetailedItems.length > 0 ? totalSize / remainingDetailedItems.length : 0,
          resolutions: [...new Set(remainingDetailedItems.map((item: any) => item.resolution).filter(Boolean))],
          formats: [...new Set(remainingDetailedItems.map((item: any) => item.format).filter(Boolean))],
          qualities: [...new Set(remainingDetailedItems.map((item: any) => item.quality).filter(Boolean))],
        },
        contentTitles: remainingDetailedItems.map((item: any) => item.title),
        contentDescriptions: remainingDetailedItems.map((item: any) => item.description || "").filter(Boolean),
        contentTags: [...new Set(remainingDetailedItems.flatMap((item: any) => item.tags || []))],
        updatedAt: new Date(),
      })

      toast({
        title: "Success",
        description: "Content removed from bundle",
      })

      await fetchProductBoxes()
    } catch (error) {
      console.error("Error removing content from bundle:", error)

      await fetchProductBoxes()

      toast({
        title: "Error",
        description: "Failed to remove content from bundle",
        variant: "destructive",
      })
    }
  }

  const handleDeleteBundle = async (productBoxId: string) => {
    if (!confirm("Are you sure you want to delete this bundle? This action cannot be undone.")) return

    try {
      const idToken = await user?.getIdToken()
      const response = await fetch(`/api/creator/bundles/${productBoxId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      })

      if (!response.ok) throw new Error("Failed to delete bundle")

      setProductBoxes((prev) => prev.filter((box) => box.id !== productBoxId))

      toast({
        title: "Success",
        description: "Bundle deleted successfully",
      })
    } catch (error) {
      console.error("Error deleting bundle:", error)
      toast({
        title: "Error",
        description: "Failed to delete bundle",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const maxBundles = freeTierLimits?.maxBundles || 5
  const canCreateMore = productBoxes.length < maxBundles

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Bundles</h1>
          <p className="text-muted-foreground">Create and manage pre-made content packages for your audience</p>
        </div>
        <Link href="/dashboard/bundles/create">
          <Button disabled={!canCreateMore}>
            <Plus className="h-4 w-4 mr-2" />
            Create Bundle
          </Button>
        </Link>
      </div>

      {!canCreateMore && (
        <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <p className="text-sm text-yellow-600 dark:text-yellow-400">
            You've reached the maximum of {maxBundles} bundles for your plan. Want more bundles?{" "}
            <Link href="/dashboard/profile" className="underline font-medium">
              Upgrade your plan
            </Link>
          </p>
        </div>
      )}

      {productBoxes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No bundles yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Create your first bundle to start selling content packages</p>
            <Link href="/dashboard/bundles/create">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Bundle
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {productBoxes.map((box) => (
            <Card key={box.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl">{box.name}</CardTitle>
                    <CardDescription className="mt-2">{box.description}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={box.active} onCheckedChange={() => handleToggleActive(box.id)} />
                    <span className="text-xs text-muted-foreground">{box.active ? "Active" : "Inactive"}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">${box.price}</span>
                    <span className="text-sm text-muted-foreground">
                      {box.contentItems?.length || 0} items
                    </span>
                  </div>

                  {box.detailedContentItems && box.detailedContentItems.length > 0 && (
                    <div className="space-y-2 pt-4 border-t">
                      <h4 className="text-sm font-semibold">Content:</h4>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {box.detailedContentItems.map((item: any) => (
                          <div key={item.id} className="flex items-center justify-between text-sm">
                            <span className="truncate flex-1">{item.title}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveContentFromBundle(box.id, item.id)}
                              className="h-6 w-6 p-0 ml-2"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-4">
                    <Link href={`/dashboard/bundles/${box.id}/edit`} className="flex-1">
                      <Button variant="outline" className="w-full" size="sm">
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    </Link>
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteBundle(box.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
