"use client"

import type { ClipPack, CreatorProfile } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Instagram, Twitter, Youtube, Globe, Copy, Star } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

interface CreatorPageProps {
  params: {
    username: string
  }
}

interface ClipPacks {
  featuredPacks: ClipPack[]
  nonFeaturedPacks: ClipPack[]
}

async function fetchCreatorClipPacks(profile: CreatorProfile): Promise<ClipPacks> {
  const response = await fetch(`/api/get-creator-clip-packs?creatorId=${profile.uid}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const data = await response.json()
  return data
}

export default function CreatorPageClient({ params }: CreatorPageProps) {
  const { username } = params
  const [profile, setProfile] = useState<CreatorProfile | null>(null)
  const [clipPacks, setClipPacks] = useState<{ featuredPacks: ClipPack[]; nonFeaturedPacks: ClipPack[] }>({
    featuredPacks: [],
    nonFeaturedPacks: [],
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadProfile() {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/get-profile?username=${username}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        setProfile(data.profile)

        if (data.profile) {
          const packs = await fetchCreatorClipPacks(data.profile)
          setClipPacks(packs)
        }
      } catch (error) {
        console.error("Failed to load profile:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadProfile()
  }, [username])

  if (isLoading) {
    return <div className="min-h-screen bg-black text-white flex items-center justify-center">Loading...</div>
  }

  if (!profile) {
    return <div className="min-h-screen bg-black text-white flex items-center justify-center">Creator Not Found</div>
  }

  const { featuredPacks, nonFeaturedPacks } = clipPacks

  return (
    <div className="min-h-screen bg-black">
      {/* Cover Image */}
      <div className="h-48 md:h-64 bg-gray-900 relative">
        {profile.coverImage ? (
          <img
            src={profile.coverImage || "/placeholder.svg"}
            alt={`${profile.displayName}'s cover`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-gray-900 to-black" />
        )}
      </div>

      {/* Profile Header */}
      <div className="max-w-6xl mx-auto px-4 relative">
        <div className="flex flex-col md:flex-row md:items-end -mt-16 md:-mt-20 mb-6 md:mb-10">
          {/* Profile Image */}
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-black overflow-hidden bg-gray-800 flex-shrink-0">
            {profile.profileImage ? (
              <img
                src={profile.profileImage || "/placeholder.svg"}
                alt={profile.displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                <span className="text-4xl font-bold text-gray-600">{profile.displayName.charAt(0).toUpperCase()}</span>
              </div>
            )}
          </div>

          <div className="mt-4 md:mt-0 md:ml-6 md:pb-2 flex-grow">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">{profile.displayName}</h1>
                <div className="flex items-center mt-1">
                  <p className="text-gray-400">@{profile.username}</p>
                  <button
                    className="ml-2 text-gray-400 hover:text-white transition-colors"
                    title="Copy profile link"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/creator/${profile.username}`)
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-4 md:mt-0 flex space-x-2">
                {profile.isVerified && <Badge className="bg-blue-600 text-white">Verified</Badge>}
              </div>
            </div>

            {profile.bio && <p className="mt-4 text-gray-300 max-w-3xl">{profile.bio}</p>}

            {/* Social Links */}
            <div className="mt-4 flex flex-wrap gap-3">
              {profile.socialLinks?.instagram && (
                <a
                  href={`https://instagram.com/${profile.socialLinks.instagram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-pink-500 transition-colors"
                  title="Instagram"
                >
                  <Instagram className="h-5 w-5" />
                </a>
              )}

              {profile.socialLinks?.twitter && (
                <a
                  href={`https://twitter.com/${profile.socialLinks.twitter}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-blue-400 transition-colors"
                  title="Twitter"
                >
                  <Twitter className="h-5 w-5" />
                </a>
              )}

              {profile.socialLinks?.youtube && (
                <a
                  href={`https://youtube.com/${profile.socialLinks.youtube}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-red-500 transition-colors"
                  title="YouTube"
                >
                  <Youtube className="h-5 w-5" />
                </a>
              )}

              {profile.socialLinks?.website && (
                <a
                  href={profile.socialLinks.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-teal-400 transition-colors"
                  title="Website"
                >
                  <Globe className="h-5 w-5" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Content Sections */}
        <div className="pb-20">
          {/* Featured Clip Packs */}
          {featuredPacks.length > 0 && (
            <div className="mb-12">
              <div className="flex items-center mb-6">
                <Star className="h-5 w-5 text-yellow-400 mr-2" />
                <h2 className="text-xl font-semibold text-white">Featured Clip Packs</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {featuredPacks.map((pack) => (
                  <div key={pack.id} className="bg-gray-900/50 border border-gray-800 rounded-lg overflow-hidden">
                    <div className="h-40 bg-gray-800 relative">
                      {pack.coverImage ? (
                        <img
                          src={pack.coverImage || "/placeholder.svg"}
                          alt={pack.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-gray-600">No Cover Image</span>
                        </div>
                      )}

                      {pack.isPaid && (
                        <div className="absolute top-2 right-2">
                          <Badge className="bg-black/70 text-white border-gray-700">Paid</Badge>
                        </div>
                      )}
                    </div>

                    <div className="p-4">
                      <h3 className="text-lg font-medium text-white mb-2">{pack.title}</h3>
                      <p className="text-gray-400 text-sm line-clamp-2 mb-3">{pack.description || "No description"}</p>

                      <div className="flex flex-wrap gap-1 mb-4">
                        {pack.tags.slice(0, 3).map((tag, i) => (
                          <Badge key={i} variant="secondary" className="bg-gray-800 text-gray-300">
                            {tag}
                          </Badge>
                        ))}
                      </div>

                      <Link href={`/clip-pack/${pack.id}`}>
                        <Button className="w-full border border-crimson bg-transparent text-white hover:bg-crimson/10 transition-all">
                          View Clip Pack
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All Clip Packs */}
          {nonFeaturedPacks.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-white mb-6">All Clip Packs</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {nonFeaturedPacks.map((pack) => (
                  <div key={pack.id} className="bg-gray-900/50 border border-gray-800 rounded-lg overflow-hidden">
                    <div className="h-40 bg-gray-800 relative">
                      {pack.coverImage ? (
                        <img
                          src={pack.coverImage || "/placeholder.svg"}
                          alt={pack.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-gray-600">No Cover Image</span>
                        </div>
                      )}

                      {pack.isPaid && (
                        <div className="absolute top-2 right-2">
                          <Badge className="bg-black/70 text-white border-gray-700">Paid</Badge>
                        </div>
                      )}
                    </div>

                    <div className="p-4">
                      <h3 className="text-lg font-medium text-white mb-2">{pack.title}</h3>
                      <p className="text-gray-400 text-sm line-clamp-2 mb-3">{pack.description || "No description"}</p>

                      <div className="flex flex-wrap gap-1 mb-4">
                        {pack.tags.slice(0, 3).map((tag, i) => (
                          <Badge key={i} variant="secondary" className="bg-gray-800 text-gray-300">
                            {tag}
                          </Badge>
                        ))}
                      </div>

                      <Link href={`/clip-pack/${pack.id}`}>
                        <Button className="w-full border border-crimson bg-transparent text-white hover:bg-crimson/10 transition-all">
                          View Clip Pack
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {featuredPacks.length === 0 && nonFeaturedPacks.length === 0 && (
            <div className="text-center py-12">
              <h3 className="text-xl text-gray-400 mb-4">No clip packs available yet</h3>
              <p className="text-gray-500">This creator hasn't published any clip packs</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
