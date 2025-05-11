"use client"

import { useState } from "react"
import { useClips } from "@/hooks/use-clips"
import ClipItem from "@/components/clip-item"
import ClipsByCategory from "@/components/clips-by-category"

interface ClipsDisplayProps {
  groupByCategory?: boolean
  showTags?: boolean
}

export function ClipsDisplay({ groupByCategory = false, showTags = true }: ClipsDisplayProps) {
  const { clips, clipsByCategory, loading, error } = useClips()
  const [filter, setFilter] = useState("")

  // Filter clips based on search term
  const filteredClips = filter
    ? clips.filter(
        (clip) =>
          clip.title?.toLowerCase().includes(filter.toLowerCase()) ||
          clip.category?.toLowerCase().includes(filter.toLowerCase()) ||
          clip.tags?.some((tag) => tag.toLowerCase().includes(filter.toLowerCase())),
      )
    : clips

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4 my-4">
        <p>Error loading clips: {error}</p>
      </div>
    )
  }

  if (clips.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 text-gray-800 rounded-md p-4 my-4">
        <p>No clips found. Please add some clips to get started.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search clips..."
          className="w-full p-2 border border-gray-300 rounded-md"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      {filter && filteredClips.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 text-gray-800 rounded-md p-4 my-4">
          <p>No clips found matching your search.</p>
        </div>
      ) : groupByCategory ? (
        <ClipsByCategory clipsByCategory={clipsByCategory} showTags={showTags} />
      ) : (
        <div className="space-y-8">
          {filteredClips.map((clip) => (
            <ClipItem key={clip.id} clip={clip} showTags={showTags} />
          ))}
        </div>
      )}
    </div>
  )
}
