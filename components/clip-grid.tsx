"use client"

import { useState } from "react"
import VimeoCard from "@/components/vimeo-card"
import { LockedClipCard } from "@/components/locked-clip-card"
import type { VimeoVideo } from "@/lib/types"
import { useAuth } from "@/contexts/auth-context"

interface ClipGridProps {
  freeClips: VimeoVideo[]
  paidClips: VimeoVideo[]
  creatorId: string
  isOwner: boolean
}

export function ClipGrid({ freeClips, paidClips, creatorId, isOwner }: ClipGridProps) {
  const [activeTab, setActiveTab] = useState<"free" | "premium">("free")
  const { user } = useAuth()

  return (
    <div className="w-full">
      {/* Tabs */}
      <div className="flex border-b border-gray-800 mb-6">
        <button
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === "free" ? "text-white border-b-2 border-red-600" : "text-gray-400 hover:text-white"
          }`}
          onClick={() => setActiveTab("free")}
        >
          Free Clips
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === "premium" ? "text-white border-b-2 border-red-600" : "text-gray-400 hover:text-white"
          }`}
          onClick={() => setActiveTab("premium")}
        >
          Premium Clips
        </button>
      </div>

      {/* Clip grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {activeTab === "free" ? (
          freeClips.length > 0 ? (
            freeClips.map((clip) => (
              <div key={clip.uri} className="flex justify-center">
                <VimeoCard video={clip} />
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-10 text-gray-400">
              {isOwner ? "You haven't added any free clips yet" : "No free clips available"}
            </div>
          )
        ) : paidClips.length > 0 ? (
          paidClips.map((clip) => (
            <div key={clip.uri} className="flex justify-center">
              {isOwner || (user && user.uid === creatorId) ? (
                <VimeoCard video={clip} />
              ) : (
                <LockedClipCard video={clip} creatorId={creatorId} />
              )}
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-10 text-gray-400">
            {isOwner ? "You haven't added any premium clips yet" : "No premium clips available"}
          </div>
        )}
      </div>
    </div>
  )
}
