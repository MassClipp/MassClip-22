"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"

interface CreatorProfileProps {
  creator: {
    uid: string
    username: string
    displayName: string
    bio: string
    profilePic: string
    freeClips: any[]
    paidClips: any[]
  }
}

export function CreatorProfile({ creator }: CreatorProfileProps) {
  const [activeTab, setActiveTab] = useState<"free" | "premium">("free")
  const { user } = useAuth()
  const isOwner = user?.uid === creator.uid

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Profile Header */}
      <div className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-8">
        <div className="w-24 h-24 md:w-32 md:h-32 relative rounded-full overflow-hidden bg-gray-200">
          {creator.profilePic ? (
            <Image
              src={creator.profilePic || "/placeholder.svg"}
              alt={creator.displayName || creator.username}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-16 w-16"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
          )}
        </div>

        <div className="flex-1 text-center md:text-left">
          <h1 className="text-2xl md:text-3xl font-bold">{creator.displayName || creator.username}</h1>
          <p className="text-gray-500 mb-2">@{creator.username}</p>

          {creator.bio && <p className="text-gray-700 mb-4 max-w-2xl">{creator.bio}</p>}

          <div className="flex flex-wrap gap-2 justify-center md:justify-start">
            {isOwner && (
              <Link
                href="/dashboard/profile"
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Edit Profile
              </Link>
            )}

            <button
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/creator/${creator.username}`)
                alert("Profile link copied to clipboard!")
              }}
            >
              Share Profile
            </button>
          </div>
        </div>
      </div>

      {/* Content Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <div className="flex space-x-8">
          <button
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "free"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
            onClick={() => setActiveTab("free")}
          >
            Free Clips
          </button>
          <button
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "premium"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
            onClick={() => setActiveTab("premium")}
          >
            Premium Clips
          </button>
        </div>
      </div>

      {/* Content */}
      <div>
        {activeTab === "free" && (
          <div>
            {creator.freeClips && creator.freeClips.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {creator.freeClips.map((clip, index) => (
                  <div key={index} className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="aspect-video relative bg-gray-200">
                      {/* Clip thumbnail or video player would go here */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-gray-500">Clip Preview</span>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold mb-2">{clip.title || `Free Clip ${index + 1}`}</h3>
                      <button className="w-full py-2 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700">
                        Download
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">No free clips available yet.</p>
                {isOwner && (
                  <Link
                    href="/dashboard/clips"
                    className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Add Clips
                  </Link>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "premium" && (
          <div>
            {creator.paidClips && creator.paidClips.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {creator.paidClips.map((clip, index) => (
                  <div key={index} className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="aspect-video relative bg-gray-200">
                      {/* Clip thumbnail with blur/lock overlay */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-12 w-12 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                          />
                        </svg>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold mb-2">{clip.title || `Premium Clip ${index + 1}`}</h3>
                      <button className="w-full py-2 px-4 bg-green-600 text-white font-medium rounded-md hover:bg-green-700">
                        Unlock for ${clip.price || "4.99"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">No premium clips available yet.</p>
                {isOwner && (
                  <Link
                    href="/dashboard/clips"
                    className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Add Premium Clips
                  </Link>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
