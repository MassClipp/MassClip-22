import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getClipPack } from "@/app/actions/clip-pack-actions"
import { getCreatorProfile } from "@/app/actions/profile-actions"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Clock, Download, Play, User, Tag, DollarSign, Lock } from "lucide-react"
import Link from "next/link"
import ClipPackPurchaseButton from "@/components/clip-pack-purchase-button"
import VideoPreview from "@/components/video-preview"

interface ClipPackPageProps {
  params: {
    id: string
  }
}

export async function generateMetadata({ params }: ClipPackPageProps): Promise<Metadata> {
  const { id } = params
  const { clipPack } = await getClipPack(id)

  if (!clipPack) {
    return {
      title: "Clip Pack Not Found | Massclip",
      description: "The clip pack you are looking for does not exist.",
    }
  }

  return {
    title: `${clipPack.title} | Massclip`,
    description: clipPack.description || `Check out this clip pack on Massclip`,
    openGraph: {
      images: clipPack.coverImage ? [clipPack.coverImage] : [],
    },
  }
}

export default async function ClipPackPage({ params }: ClipPackPageProps) {
  const { id } = params
  const { clipPack } = await getClipPack(id)

  if (!clipPack || !clipPack.isPublished) {
    notFound()
  }

  const { profile: creator } = await getCreatorProfile(clipPack.creatorId)

  if (!creator) {
    notFound()
  }

  // Format duration
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Column - Clip Pack Info */}
          <div className="w-full lg:w-2/3">
            <div className="mb-6">
              <Link href={`/creator/${creator.username}`} className="text-gray-400 hover:text-white transition-colors">
                ← Back to {creator.displayName}'s profile
              </Link>
            </div>

            <div className="bg-gray-900/50 border border-gray-800 rounded-lg overflow-hidden mb-8">
              <div className="h-64 bg-gray-800 relative">
                {clipPack.coverImage ? (
                  <img
                    src={clipPack.coverImage || "/placeholder.svg"}
                    alt={clipPack.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-gray-600">No Cover Image</span>
                  </div>
                )}

                {clipPack.isPaid && (
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-black/70 text-white border-gray-700 px-3 py-1 text-sm">
                      <DollarSign className="h-4 w-4 mr-1" />
                      Paid Content
                    </Badge>
                  </div>
                )}
              </div>

              <div className="p-6">
                <div className="flex items-center mb-4">
                  <Link
                    href={`/creator/${creator.username}`}
                    className="flex items-center text-gray-300 hover:text-white"
                  >
                    <User className="h-4 w-4 mr-1" />
                    <span>{creator.displayName}</span>
                  </Link>
                </div>

                <h1 className="text-2xl md:text-3xl font-bold text-white mb-3">{clipPack.title}</h1>

                <p className="text-gray-300 mb-6">{clipPack.description || "No description provided"}</p>

                <div className="flex flex-wrap gap-2 mb-6">
                  {clipPack.tags.map((tag, i) => (
                    <Badge key={i} variant="secondary" className="bg-gray-800 text-gray-300">
                      <Tag className="h-3 w-3 mr-1" />
                      {tag}
                    </Badge>
                  ))}
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                  <div className="flex items-center">
                    <Play className="h-4 w-4 mr-1" />
                    <span>{clipPack.clips.length} clips</span>
                  </div>

                  {clipPack.clips.length > 0 && (
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      <span>
                        {formatDuration(clipPack.clips.reduce((total, clip) => total + (clip.duration || 0), 0))} total
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Clips List */}
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">Clips in this pack</h2>

              <div className="space-y-4">
                {clipPack.clips.map((clip, index) => (
                  <Card key={clip.id} className="bg-gray-900/50 border-gray-800">
                    <CardContent className="p-0">
                      <div className="flex flex-col md:flex-row">
                        <div className="w-full md:w-48 h-32 bg-gray-800 relative flex-shrink-0">
                          {clip.thumbnailUrl ? (
                            <img
                              src={clip.thumbnailUrl || "/placeholder.svg"}
                              alt={clip.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="text-gray-600">No Thumbnail</span>
                            </div>
                          )}

                          {clip.duration > 0 && (
                            <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                              {formatDuration(clip.duration)}
                            </div>
                          )}

                          {clipPack.isPaid && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                              <Lock className="h-8 w-8 text-white/70" />
                            </div>
                          )}
                        </div>

                        <div className="p-4 flex-grow">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="text-white font-medium mb-1">
                                {index + 1}. {clip.title}
                              </h3>

                              {clip.description && <p className="text-gray-400 text-sm mb-3">{clip.description}</p>}

                              <div className="flex items-center text-xs text-gray-500">
                                {clip.fileSize > 0 && <span className="mr-3">{formatFileSize(clip.fileSize)}</span>}

                                {clip.resolution && <span className="mr-3">{clip.resolution}</span>}

                                {clip.format && <span>{clip.format.split("/")[1]?.toUpperCase()}</span>}
                              </div>
                            </div>

                            {!clipPack.isPaid && (
                              <VideoPreview videoUrl={clip.videoUrl} thumbnailUrl={clip.thumbnailUrl} />
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {clipPack.clips.length === 0 && (
                  <div className="text-center py-8 text-gray-400">No clips available in this pack yet</div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Purchase/Download */}
          <div className="w-full lg:w-1/3">
            <div className="sticky top-4">
              <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 mb-6">
                <div className="mb-6">
                  {clipPack.isPaid ? (
                    <>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-300">Price</span>
                        <span className="text-2xl font-bold text-white">${clipPack.price.toFixed(2)}</span>
                      </div>

                      <ClipPackPurchaseButton
                        clipPackId={clipPack.id}
                        price={clipPack.price}
                        creatorId={clipPack.creatorId}
                      />

                      <p className="text-xs text-gray-500 mt-3">
                        Purchase includes unlimited access to all clips in this pack
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-gray-300">Price</span>
                        <Badge className="bg-green-900/50 text-green-400 border-green-800">Free</Badge>
                      </div>

                      <Button className="w-full bg-crimson hover:bg-crimson/90 text-white">
                        <Download className="h-4 w-4 mr-2" />
                        Download All Clips
                      </Button>
                    </>
                  )}
                </div>

                <div className="border-t border-gray-800 pt-4">
                  <h3 className="text-white font-medium mb-3">About the Creator</h3>

                  <Link href={`/creator/${creator.username}`} className="flex items-center mb-3">
                    <div className="w-10 h-10 rounded-full bg-gray-800 overflow-hidden mr-3">
                      {creator.profileImage ? (
                        <img
                          src={creator.profileImage || "/placeholder.svg"}
                          alt={creator.displayName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-gray-600 font-bold">{creator.displayName.charAt(0).toUpperCase()}</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="text-white font-medium">{creator.displayName}</p>
                      <p className="text-gray-400 text-sm">@{creator.username}</p>
                    </div>
                  </Link>

                  <Link href={`/creator/${creator.username}`}>
                    <Button
                      variant="outline"
                      className="w-full border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
                    >
                      View Profile
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
