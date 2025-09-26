"use client"

import { useState, useEffect } from "react"
import { Folder, FolderPlus, ChevronRight } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface FolderSelectorProps {
  selectedFolderId: string | null
  onFolderSelect: (folderId: string | null) => void
  className?: string
}

interface FolderItem {
  id: string
  name: string
  path: string
  parentId: string | null
  level: number
}

export default function FolderSelector({ selectedFolderId, onFolderSelect, className }: FolderSelectorProps) {
  const [folders, setFolders] = useState<FolderItem[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [selectedFolder, setSelectedFolder] = useState<FolderItem | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  const fetchFolders = async () => {
    try {
      setIsLoading(true)

      // Get ID token for authentication
      const user = (await import("@/lib/firebase")).auth.currentUser
      if (!user) {
        console.log("[v0] No authenticated user found")
        setFolders([])
        return
      }

      const idToken = await user.getIdToken()

      const response = await fetch(`/api/folders?t=${Date.now()}`, {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch folders: ${response.status}`)
      }

      const data = await response.json()
      console.log("[v0] Raw API response:", data)
      console.log("[v0] Total folders from API:", data.folders?.length || 0)

      const activeFolders = data.folders.filter((folder: any) => !folder.isDeleted)
      console.log("[v0] Active folders after filtering:", activeFolders.length)
      console.log(
        "[v0] Active folders details:",
        activeFolders.map((f: any) => ({ id: f.id, name: f.name, path: f.path, isDeleted: f.isDeleted })),
      )

      // Transform folders to include level for indentation and sort by path
      const transformedFolders = activeFolders
        .map((folder: any) => ({
          id: folder.id,
          name: folder.name,
          path: folder.path,
          parentId: folder.parentId,
          level: (folder.path.match(/\//g) || []).length - 1, // Count slashes to determine level
        }))
        .sort((a: FolderItem, b: FolderItem) => a.path.localeCompare(b.path)) // Sort by path for proper hierarchy

      console.log("[v0] Final transformed folders for dropdown:", transformedFolders)
      console.log(
        "[v0] Folder names that will appear in dropdown:",
        transformedFolders.map((f) => f.name),
      )
      setFolders(transformedFolders)
    } catch (error) {
      console.error("[v0] Error fetching folders:", error)
      toast({
        title: "Error",
        description: "Failed to load folders",
        variant: "destructive",
      })
      setFolders([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchFolders()
  }, [])

  useEffect(() => {
    if (selectedFolderId) {
      const folder = folders.find((f) => f.id === selectedFolderId)
      setSelectedFolder(folder || null)
    } else {
      setSelectedFolder(null)
    }
  }, [selectedFolderId, folders])

  const handleFolderSelect = (folder: FolderItem | null) => {
    setSelectedFolder(folder)
    onFolderSelect(folder?.id || null)
    setIsOpen(false)
  }

  const refreshFolders = () => {
    fetchFolders()
  }

  return (
    <div className={`relative ${className}`}>
      <label className="block text-white mb-2 flex items-center justify-between">
        Upload Location
        <button
          type="button"
          onClick={refreshFolders}
          className="text-xs text-zinc-400 hover:text-white transition-colors"
          disabled={isLoading}
        >
          {isLoading ? "Loading..." : "Refresh"}
        </button>
      </label>

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-zinc-900 border border-zinc-700 rounded-md p-3 text-left text-white focus:outline-none focus:ring-1 focus:ring-red-500 flex items-center justify-between"
        disabled={isLoading}
      >
        <div className="flex items-center">
          <Folder className="h-4 w-4 text-zinc-400 mr-2" />
          <span>{isLoading ? "Loading..." : selectedFolder ? selectedFolder.name : "Root Folder"}</span>
        </div>
        <ChevronRight className={`h-4 w-4 text-zinc-400 transition-transform ${isOpen ? "rotate-90" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-zinc-900 border border-zinc-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
          <button
            type="button"
            onClick={() => handleFolderSelect(null)}
            className="w-full px-3 py-2 text-left text-white hover:bg-zinc-800 flex items-center"
          >
            <Folder className="h-4 w-4 text-zinc-400 mr-2" />
            Root Folder
          </button>

          {folders.map((folder) => (
            <button
              key={folder.id}
              type="button"
              onClick={() => handleFolderSelect(folder)}
              className="w-full px-3 py-2 text-left text-white hover:bg-zinc-800 flex items-center"
              style={{ paddingLeft: `${12 + folder.level * 20}px` }}
            >
              <Folder className="h-4 w-4 text-zinc-400 mr-2" />
              {folder.name}
            </button>
          ))}

          {folders.length > 0 && (
            <div className="px-3 py-1 text-xs text-zinc-500 border-t border-zinc-700">
              {folders.length} folder{folders.length !== 1 ? "s" : ""} available
            </div>
          )}

          <div className="border-t border-zinc-700 p-2">
            <button
              type="button"
              onClick={() => {
                // TODO: Open create folder modal
                setIsOpen(false)
              }}
              className="w-full px-2 py-1 text-left text-zinc-400 hover:text-white hover:bg-zinc-800 rounded flex items-center text-sm"
            >
              <FolderPlus className="h-4 w-4 mr-2" />
              Create New Folder
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
