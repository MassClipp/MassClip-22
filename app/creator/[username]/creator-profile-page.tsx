"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Share2, CheckCircle, Instagram, Twitter, Youtube, Globe } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { CreatorProfile, UserClip } from "@/lib/types"
import { formatDistanceToNow } from "date-fns"

interface CreatorProfilePageProps {
  profile: CreatorProfile
}

export default function CreatorProfilePage({ profile }: CreatorProfilePageProps) {
  const [freeClips, setFreeClips] = useState<UserClip[]>([])
  const [paidClips, setPaidClips] = useState<UserClip[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    async function fetchCreatorClips() {
      try {
        const response = await fetch(`/api/creator/${profile.uid}/clips`)
        const data = await response.json()

        if (data.clips) {
          // Separate free and paid clips
          const free = data.clips.filter((clip: UserClip) => !clip.isPaid)
          const paid = data.clips.filter((clip: UserClip) => clip.isPaid)

          setFreeClips(free)
          setPaidClips(paid)
        }
      } catch (error) {
        console.error("Error fetching creator clips:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCreatorClips()
  }, [profile.uid])

  const handleShareProfile = async () => {
    const shareUrl = `${window.location.origin}/creator/${profile.username}`

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${profile.displayName} on MassClip`,
          text: `Check out ${profile.displayName}'s clips on MassClip`,
          url: shareUrl,
        })
      } catch (error) {
        console.error("Error sharing:", error)
        copyToClipboard(shareUrl)
      }
    } else {
      copyToClipboard(shareUrl)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Link copied!",
      description: "Profile link copied to clipboard",
    })
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Cover Image and Profile Section */}
      <div className="relative">
        <div className="h-48 md:h-64 w-full bg-gradient-to-r from-gray-900 to-gray-800 relative overflow-hidden">
          {profile.coverImage && (
            <Image
              src={profile.coverImage || "/placeholder.svg"}
              alt={`${profile.displayName}'s cover`}
              fill
              className="object-cover opacity-70"
              priority
            />
          )}
        </div>

        <div className="container mx-auto px-4">
          <div className="relative flex flex-col md:flex-row items-start md:items-end -mt-16 md:-mt-20 mb-6">
            {/* Profile Image */}
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-black overflow-hidden bg-gray-800 flex-shrink-0 relative z-10">
              {profile.profileImage ? (
                <Image
                  src={profile.profileImage || "/placeholder.svg"}
                  alt={profile.displayName}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-bold">
                  {profile.displayName.charAt(0)}
                </div>
              )}
            </div>

            {/* Creator Info */}
            <div className="mt-4 md:mt-0 md:ml-4 md:mb-2 flex-grow">
              <div className="flex items-center">
                <h1 className="text-2xl md:text-3xl font-bold">{profile.displayName}</h1>
                {profile.isVerified && <CheckCircle className="ml-2 text-blue-500 h-5 w-5" />}
              </div>
              <p className="text-gray-400 text-sm md:text-base">@{profile.username}</p>
            </div>

            {/* Share Button */}
            <button
              onClick={handleShareProfile}
              className="mt-4 md:mt-0 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-full flex items-center transition-colors"
            >
              <Share2 className="h-4 w-4 mr-2" />
              <span>Share Profile</span>
            </button>
          </div>

          {/* Bio */}
          {profile.bio && (
            <div className="mb-6">
              <p className="text-gray-300">{profile.bio}</p>
            </div>
          )}

          {/* Social Links */}
          {profile.socialLinks && Object.values(profile.socialLinks).some((link) => !!link) && (
            <div className="flex space-x-4 mb-8">
              {profile.socialLinks.instagram && (
                <a
                  href={`https://instagram.com/${profile.socialLinks.instagram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <Instagram className="h-5 w-5" />
                </a>
              )}
              {profile.socialLinks.twitter && (
                <a
                  href={`https://twitter.com/${profile.socialLinks.twitter}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <Twitter className="h-5 w-5" />
                </a>
              )}
              {profile.socialLinks.youtube && (
                <a
                  href={`https://youtube.com/${profile.socialLinks.youtube}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <Youtube className="h-5 w-5" />
                </a>
              )}
              {profile.socialLinks.website && (
                <a
                  href={profile.socialLinks.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <Globe className="h-5 w-5" />
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Free Clips Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6 border-b border-gray-800 pb-2">Free Clips</h2>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-gray-800 rounded-lg overflow-hidden animate-pulse">
                  <div className="aspect-video bg-gray-700"></div>
                  <div className="p-4">
                    <div className="h-4 bg-gray-700 rounded mb-2"></div>
                    <div className="h-3 bg-gray-700 rounded w-3/4"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : freeClips.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {freeClips.map((clip) => (
                <ClipCard key={clip.id} clip={clip} />
              ))}
            </div>
          ) : (
            <p className="text-gray-400">No free clips available yet.</p>
          )}
        </section>

        {/* Paid Clips Section */}
        <section>
          <h2 className="text-2xl font-bold mb-6 border-b border-gray-800 pb-2">Premium Clips</h2>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-gray-800 rounded-lg overflow-hidden animate-pulse">
                  <div className="aspect-video bg-gray-700"></div>
                  <div className="p-4">
                    <div className="h-4 bg-gray-700 rounded mb-2"></div>
                    <div className="h-3 bg-gray-700 rounded w-3/4"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : paidClips.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {paidClips.map((clip) => (
                <ClipCard key={clip.id} clip={clip} isPremium />
              ))}
            </div>
          ) : (
            <p className="text-gray-400">No premium clips available yet.</p>
          )}
        </section>
      </div>
    </div>
  )
}

function ClipCard({ clip, isPremium = false }: { clip: UserClip; isPremium?: boolean }) {
  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden hover:ring-1 hover:ring-red-500 transition-all">
      <div className="aspect-video relative">
        <Image
          src={clip.thumbnailUrl || "/placeholder.svg?height=180&width=320&query=video+thumbnail"}
          alt={clip.title}
          fill
          className="object-cover"
        />

        {/* Play Button Overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 opacity-0 hover:opacity-100 transition-opacity">
          <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>

        {/* Duration Badge */}
        <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 px-2 py-1 text-xs rounded">
          {formatDuration(clip.duration)}
        </div>

        {/* Premium Badge */}
        {isPremium && (
          <div className="absolute top-2 right-2 bg-red-600 px-2 py-1 text-xs font-bold rounded">PREMIUM</div>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-medium text-white mb-1 line-clamp-1">{clip.title}</h3>
        <div className="flex justify-between items-center text-sm text-gray-400">
          <span>{formatDate(clip.createdAt)}</span>
          {isPremium && clip.price && <span className="font-bold text-red-500">${clip.price.toFixed(2)}</span>}
        </div>
      </div>
    </div>
  )
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
}

function formatDate(date: Date): string {
  if (!(date instanceof Date)) {
    date = new Date(date)
  }
  return formatDistanceToNow(date, { addSuffix: true })
}
