"use client"

import { useState, useEffect } from "react"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RefreshCw, Folder, FolderOpen } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface FolderData {
  id: string
  name: string
  path: string
  parentId?: string
  level: number
}

interface NewFolderSelectorProps {
  selectedFolderId: string | null
  onFolderSelect: (folderId: string | null) => void
  className?: string
}

export default function NewFolderSelector({ selectedFolderId, onFolderSelect, className }: NewFolderSelectorProps) {
  const { user } = useFirebaseAuth()
  const { toast } = useToast()
  const [folders, setFolders] = useState<FolderData[]>([])
  const [loading, setLoading] = useState(false)

  const fetchFolders = async () => {
    if (!user) return

    try {
      setLoading(true)
      const token = await user.getIdToken()

      // Add cache-busting parameter to ensure fresh data
      const timestamp = Date.now()
      const response = await fetch(`/api/folders?t=${timestamp}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch folders: ${response.status}`)
      }

      const data = await response.json()
      console.log("[NewFolderSelector] Raw API response:", data)

      // Process folders and build hierarchy
      const foldersArray = Array.isArray(data.folders) ? data.folders : []
      console.log("[NewFolderSelector] Folders array:", foldersArray)

      // Filter out deleted folders and build hierarchy
      const activeFolders = foldersArray
        .filter((folder: any) => !folder.deleted && folder.name)
        .map((folder: any) => ({
          id: folder.id,
          name: folder.name,
          path: folder.path || folder.name,
          parentId: folder.parentId,
          level: 0, // Will be calculated below
        }))

      // Calculate folder levels for proper indentation
      const calculateLevel = (folder: FolderData, allFolders: FolderData[]): number => {
        if (!folder.parentId) return 0
        const parent = allFolders.find((f) => f.id === folder.parentId)
        return parent ? calculateLevel(parent, allFolders) + 1 : 0
      }

      activeFolders.forEach((folder) => {
        folder.level = calculateLevel(folder, activeFolders)
      })

      // Sort folders: parents first, then by name
      const sortedFolders = activeFolders.sort((a, b) => {
        if (a.level !== b.level) return a.level - b.level
        return a.name.localeCompare(b.name)
      })

      console.log("[NewFolderSelector] Processed folders:", sortedFolders)
      setFolders(sortedFolders)
    } catch (error) {
      console.error("[NewFolderSelector] Error fetching folders:", error)
      toast({
        title: "Error",
        description: "Failed to load folders",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchFolders()
    }
  }, [user])

  const handleFolderChange = (value: string) => {
    if (value === "root") {
      onFolderSelect(null)
    } else {
      onFolderSelect(value)
    }
  }

  const getIndentedName = (folder: FolderData) => {
    const indent = "  ".repeat(folder.level)
    return `${indent}${folder.name}`
  }

  const selectedFolder = folders.find((f) => f.id === selectedFolderId)

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-white">Upload Location</label>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchFolders}
          disabled={loading}
          className="h-8 w-8 p-0 text-zinc-400 hover:text-white"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <Select value={selectedFolderId || "root"} onValueChange={handleFolderChange}>
        <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
          <SelectValue>
            <div className="flex items-center gap-2">
              {selectedFolderId ? (
                <>
                  <FolderOpen className="h-4 w-4" />
                  <span>{selectedFolder?.name || "Unknown Folder"}</span>
                </>
              ) : (
                <>
                  <Folder className="h-4 w-4" />
                  <span>Root Folder</span>
                </>
              )}
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-zinc-800 border-zinc-700">
          <SelectItem value="root" className="text-white hover:bg-zinc-700">
            <div className="flex items-center gap-2">
              <Folder className="h-4 w-4" />
              <span>Root Folder</span>
            </div>
          </SelectItem>
          {folders.map((folder) => (
            <SelectItem key={folder.id} value={folder.id} className="text-white hover:bg-zinc-700">
              <div className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                <span style={{ fontFamily: "monospace" }}>{getIndentedName(folder)}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {loading && (
        <div className="text-xs text-zinc-400 flex items-center gap-1">
          <RefreshCw className="h-3 w-3 animate-spin" />
          Loading folders...
        </div>
      )}

      <div className="text-xs text-zinc-500">
        {folders.length} folder{folders.length !== 1 ? "s" : ""} available
      </div>
    </div>
  )
}
