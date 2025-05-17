"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { getClipPacks, toggleClipPackFeatured, deleteClipPack } from "@/app/actions/clip-pack-actions"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Loader2, Plus, Edit, Trash2, Star, Video, Eye, DollarSign } from "lucide-react"
import type { ClipPack } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"

export default function ClipPacksPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [clipPacks, setClipPacks] = useState<ClipPack[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [packToDelete, setPackToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [featuredPacks, setFeaturedPacks] = useState<string[]>([])

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return

      try {
        const { clipPacks: packs, error: fetchError } = await getClipPacks(user.uid)

        if (fetchError) {
          setError(fetchError)
        } else {
          setClipPacks(packs)

          // Get featured packs
          const profileResult = await fetch(`/api/creator-profile?userId=${user.uid}`)
          const profileData = await profileResult.json()

          if (profileData.profile) {
            setFeaturedPacks(profileData.profile.featured || [])
          }
        }
      } catch (err) {
        setError("Failed to load clip packs")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user])

  const handleToggleFeatured = async (packId: string, featured: boolean) => {
    if (!user) return

    try {
      const result = await toggleClipPackFeatured(packId, user.uid, !featured)

      if (result.success) {
        if (featured) {
          setFeaturedPacks(featuredPacks.filter((id) => id !== packId))
        } else {
          setFeaturedPacks([...featuredPacks, packId])
        }

        toast({
          title: featured ? "Removed from featured" : "Added to featured",
          description: featured
            ? "Clip pack removed from your featured content"
            : "Clip pack added to your featured content",
        })
      } else {
        toast({
          variant: "destructive",
          title: "Action failed",
          description: result.message || "Failed to update featured status",
        })
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Action failed",
        description: "An error occurred while updating featured status",
      })
      console.error(err)
    }
  }

  const confirmDelete = (packId: string) => {
    setPackToDelete(packId)
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!user || !packToDelete) return

    setIsDeleting(true)

    try {
      const result = await deleteClipPack(packToDelete, user.uid)

      if (result.success) {
        setClipPacks(clipPacks.filter((pack) => pack.id !== packToDelete))
        setFeaturedPacks(featuredPacks.filter((id) => id !== packToDelete))

        toast({
          title: "Clip pack deleted",
          description: "The clip pack has been permanently deleted",
        })
      } else {
        toast({
          variant: "destructive",
          title: "Deletion failed",
          description: result.message || "Failed to delete clip pack",
        })
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Deletion failed",
        description: "An error occurred while deleting the clip pack",
      })
      console.error(err)
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
      setPackToDelete(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black p-4 flex items-center justify-center">
        <div className="flex items-center">
          <Loader2 className="h-6 w-6 animate-spin text-crimson" />
          <span className="ml-2 text-gray-300">Loading clip packs...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black p-4 py-12">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-light tracking-tight text-white">Your Clip Packs</h1>

          <Button
            onClick={() => router.push("/dashboard/creator/clip-packs/new")}
            className="border border-crimson bg-transparent text-white hover:bg-crimson/10 transition-all"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Clip Pack
          </Button>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6 border-gray-800 bg-black/80 backdrop-blur-sm">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {clipPacks.length === 0 ? (
          <Card className="border-gray-800 bg-black/50 backdrop-blur-sm">
            <CardContent className="p-8 flex flex-col items-center justify-center">
              <Video className="h-16 w-16 text-gray-600 mb-4" />
              <h2 className="text-xl font-medium text-white mb-2">No Clip Packs Yet</h2>
              <p className="text-gray-400 text-center mb-6">
                Create your first clip pack to start sharing your content with others
              </p>
              <Button
                onClick={() => router.push("/dashboard/creator/clip-packs/new")}
                className="border border-crimson bg-transparent text-white hover:bg-crimson/10 transition-all"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Clip Pack
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clipPacks.map((pack) => {
              const isFeatured = featuredPacks.includes(pack.id)

              return (
                <Card key={pack.id} className="border-gray-800 bg-black/50 backdrop-blur-sm overflow-hidden">
                  <div className="relative h-40 bg-gray-900">
                    {pack.coverImage ? (
                      <img
                        src={pack.coverImage || "/placeholder.svg"}
                        alt={pack.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-800">
                        <Video className="h-12 w-12 text-gray-600" />
                      </div>
                    )}

                    <div className="absolute top-2 right-2 flex gap-1">
                      {pack.isPaid && (
                        <Badge variant="outline" className="bg-black/70 text-white border-gray-700">
                          <DollarSign className="h-3 w-3 mr-1" />
                          Paid
                        </Badge>
                      )}

                      {!pack.isPublished && (
                        <Badge variant="outline" className="bg-black/70 text-yellow-400 border-yellow-800">
                          Draft
                        </Badge>
                      )}
                    </div>
                  </div>

                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg text-white">{pack.title}</CardTitle>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-8 w-8 ${isFeatured ? "text-yellow-400" : "text-gray-500"}`}
                        onClick={() => handleToggleFeatured(pack.id, isFeatured)}
                        title={isFeatured ? "Remove from featured" : "Add to featured"}
                      >
                        <Star className="h-5 w-5" />
                      </Button>
                    </div>
                    <CardDescription className="line-clamp-2 text-gray-400">
                      {pack.description || "No description"}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="pb-2">
                    <div className="flex items-center text-sm text-gray-400 mb-2">
                      <Video className="h-4 w-4 mr-1" />
                      <span>{pack.clips.length} clips</span>

                      <Eye className="h-4 w-4 ml-4 mr-1" />
                      <span>{pack.totalViews || 0} views</span>
                    </div>

                    <div className="flex flex-wrap gap-1 mt-2">
                      {pack.tags.slice(0, 3).map((tag, i) => (
                        <Badge key={i} variant="secondary" className="bg-gray-800 text-gray-300">
                          {tag}
                        </Badge>
                      ))}
                      {pack.tags.length > 3 && (
                        <Badge variant="secondary" className="bg-gray-800 text-gray-300">
                          +{pack.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  </CardContent>

                  <CardFooter className="pt-2">
                    <div className="flex justify-between w-full">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-300 hover:bg-red-950/30"
                        onClick={() => confirmDelete(pack.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-blue-400 hover:text-blue-300 hover:bg-blue-950/30"
                        onClick={() => router.push(`/dashboard/creator/clip-packs/${pack.id}`)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="border-gray-800 bg-black/90 backdrop-blur-sm text-white">
          <DialogHeader>
            <DialogTitle>Delete Clip Pack</DialogTitle>
            <DialogDescription className="text-gray-400">
              This action cannot be undone. This will permanently delete the clip pack and all its content.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="text-red-400">Are you sure you want to delete this clip pack?</p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
