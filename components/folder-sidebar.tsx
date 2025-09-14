"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronRight, ChevronDown, Folder, FolderPlus, X, Plus, MoreVertical, Edit2, Trash2 } from "lucide-react"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useToast } from "@/components/ui/use-toast"

interface FolderSidebarProps {
  isOpen: boolean
  onClose: () => void
  selectedFolderId: string
  onFolderSelect: (folderId: string) => void
  onFolderCreated: () => void
}

interface FolderItem {
  id: string
  name: string
  path: string
  parentId: string | null
  children?: FolderItem[]
  isExpanded?: boolean
  isDeleted?: boolean
}

export default function FolderSidebar({
  isOpen,
  onClose,
  selectedFolderId,
  onFolderSelect,
  onFolderCreated,
}: FolderSidebarProps) {
  const { user } = useFirebaseAuth()
  const { toast } = useToast()
  const [folders, setFolders] = useState<FolderItem[]>([])
  const [loading, setLoading] = useState(false)
  const [creatingFolder, setCreatingFolder] = useState<string | null>(null)
  const [newFolderName, setNewFolderName] = useState("")
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")

  const fetchFolders = async () => {
    if (!user) {
      console.log("[v0] No user available for folder fetch")
      return
    }

    console.log("[v0] Fetching folders for user:", user.uid)
    setLoading(true)
    try {
      const token = await user.getIdToken()
      console.log("[v0] Got ID token, length:", token.length)
      console.log("[v0] Token preview:", token.substring(0, 50) + "...")

      const response = await fetch("/api/folders", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      console.log("[v0] Folders API response status:", response.status)
      console.log("[v0] Response headers:", Object.fromEntries(response.headers.entries()))

      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Folders API success:", data)
        const hierarchicalFolders = buildFolderHierarchy(data.folders || [])
        setFolders(hierarchicalFolders)
      } else {
        const errorData = await response.text()
        console.error("[v0] Folders API error:", response.status, errorData)
      }
    } catch (error) {
      console.error("[v0] Failed to fetch folders:", error)
    } finally {
      setLoading(false)
    }
  }

  const buildFolderHierarchy = (flatFolders: any[]): FolderItem[] => {
    const activeFolders = flatFolders.filter((folder) => !folder.isDeleted)

    const folderMap = new Map<string, FolderItem>()
    const rootFolders: FolderItem[] = []

    // Create folder items
    activeFolders.forEach((folder) => {
      folderMap.set(folder.id, {
        id: folder.id,
        name: folder.name,
        path: folder.path,
        parentId: folder.parentId,
        children: [],
        isExpanded: false,
      })
    })

    // Build hierarchy
    folderMap.forEach((folder) => {
      if (folder.parentId && folderMap.has(folder.parentId)) {
        const parent = folderMap.get(folder.parentId)!
        parent.children = parent.children || []
        parent.children.push(folder)
      } else {
        rootFolders.push(folder)
      }
    })

    const sortFolders = (folders: FolderItem[]): FolderItem[] => {
      return folders
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((folder) => ({
          ...folder,
          children: folder.children ? sortFolders(folder.children) : [],
        }))
    }

    return sortFolders(rootFolders)
  }

  const createFolder = async (parentId: string | null) => {
    if (!user || !newFolderName.trim()) {
      console.log("[v0] Cannot create folder - missing user or name")
      return
    }

    console.log("[v0] Creating folder:", newFolderName.trim(), "in parent:", parentId)
    try {
      const token = await user.getIdToken()
      console.log("[v0] Got token for folder creation, length:", token.length)

      const response = await fetch("/api/folders", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newFolderName.trim(),
          parentId,
        }),
      })

      console.log("[v0] Create folder response status:", response.status)

      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Folder created successfully:", data)
        setNewFolderName("")
        setCreatingFolder(null)
        await fetchFolders()
        onFolderCreated()
      } else {
        const errorData = await response.text()
        console.error("[v0] Create folder error:", response.status, errorData)
      }
    } catch (error) {
      console.error("[v0] Failed to create folder:", error)
    }
  }

  const renameFolder = async (folderId: string) => {
    if (!user || !renameValue.trim()) return

    try {
      const token = await user.getIdToken()
      const response = await fetch(`/api/folders/${folderId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: renameValue.trim(),
        }),
      })

      if (response.ok) {
        toast({
          title: "Success!",
          description: "Folder renamed successfully",
        })
        setRenamingFolder(null)
        setRenameValue("")
        await fetchFolders()
      } else {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.error || "Failed to rename folder",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to rename folder",
        variant: "destructive",
      })
    }
  }

  const deleteFolder = async (folderId: string, folderName: string) => {
    if (!user) return

    if (!confirm(`Are you sure you want to delete "${folderName}"? This action cannot be undone.`)) {
      return
    }

    try {
      const token = await user.getIdToken()
      const response = await fetch(`/api/folders/${folderId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        toast({
          title: "Success!",
          description: "Folder deleted successfully",
        })
        // If the deleted folder was selected, switch to main
        if (selectedFolderId === folderId) {
          onFolderSelect("main")
        }
        await fetchFolders()
      } else {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.error || "Failed to delete folder",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete folder",
        variant: "destructive",
      })
    }
  }

  const toggleFolder = (folderId: string) => {
    const updateFolders = (folders: FolderItem[]): FolderItem[] => {
      return folders.map((folder) => {
        if (folder.id === folderId) {
          return { ...folder, isExpanded: !folder.isExpanded }
        }
        if (folder.children) {
          return { ...folder, children: updateFolders(folder.children) }
        }
        return folder
      })
    }
    setFolders(updateFolders(folders))
  }

  const renderFolder = (folder: FolderItem, level = 0) => {
    const hasChildren = folder.children && folder.children.length > 0
    const isSelected = selectedFolderId === folder.id
    const isRenaming = renamingFolder === folder.id

    return (
      <div key={folder.id}>
        <div
          className={`flex items-center gap-2 py-2 px-3 hover:bg-zinc-800/30 cursor-pointer group ${
            isSelected ? "bg-zinc-800/50 border-l-2 border-white" : ""
          }`}
          style={{ paddingLeft: `${12 + level * 16}px` }}
        >
          {hasChildren ? (
            <button onClick={() => toggleFolder(folder.id)} className="p-0.5 hover:bg-zinc-700/50 rounded">
              {folder.isExpanded ? (
                <ChevronDown className="h-3 w-3 text-zinc-400" />
              ) : (
                <ChevronRight className="h-3 w-3 text-zinc-400" />
              )}
            </button>
          ) : (
            <div className="w-4" />
          )}

          <Folder className="h-4 w-4 text-zinc-400" />

          {isRenaming ? (
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="h-6 text-xs bg-zinc-900 border-zinc-700 text-white flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter") renameFolder(folder.id)
                if (e.key === "Escape") {
                  setRenamingFolder(null)
                  setRenameValue("")
                }
              }}
              onBlur={() => {
                setRenamingFolder(null)
                setRenameValue("")
              }}
              autoFocus
            />
          ) : (
            <button
              onClick={() => onFolderSelect(folder.id)}
              className="flex-1 text-left text-sm text-zinc-300 hover:text-white truncate"
            >
              {folder.name}
            </button>
          )}

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
            <button onClick={() => setCreatingFolder(folder.id)} className="p-1 hover:bg-zinc-700/50 rounded">
              <Plus className="h-3 w-3 text-zinc-400" />
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1 hover:bg-zinc-700/50 rounded">
                  <MoreVertical className="h-3 w-3 text-zinc-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-zinc-900 border-zinc-800">
                <DropdownMenuItem
                  onClick={() => {
                    setRenamingFolder(folder.id)
                    setRenameValue(folder.name)
                  }}
                >
                  <Edit2 className="h-3 w-3 mr-2" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => deleteFolder(folder.id, folder.name)} className="text-red-400">
                  <Trash2 className="h-3 w-3 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {creatingFolder === folder.id && (
          <div className="px-3 py-2" style={{ paddingLeft: `${28 + level * 16}px` }}>
            <div className="flex items-center gap-2">
              <Input
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder name"
                className="h-7 text-xs bg-zinc-900 border-zinc-700 text-white"
                onKeyDown={(e) => {
                  if (e.key === "Enter") createFolder(folder.id)
                  if (e.key === "Escape") {
                    setCreatingFolder(null)
                    setNewFolderName("")
                  }
                }}
                autoFocus
              />
              <Button
                size="sm"
                onClick={() => createFolder(folder.id)}
                className="h-7 px-2 bg-white text-black hover:bg-zinc-200"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}

        {hasChildren && folder.isExpanded && (
          <div>{folder.children!.map((child) => renderFolder(child, level + 1))}</div>
        )}
      </div>
    )
  }

  useEffect(() => {
    if (isOpen && user) {
      fetchFolders()
    }
  }, [isOpen, user])

  if (!isOpen) return null

  return (
    <div className="fixed inset-y-0 left-0 z-50 w-80 bg-zinc-950 border-r border-zinc-800 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <FolderPlus className="h-5 w-5 text-white" />
          <h2 className="text-sm font-medium text-white uppercase tracking-wide">Content Folders</h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-8 w-8 p-0 text-zinc-400 hover:text-white hover:bg-zinc-800"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-3 border-b border-zinc-800/50">
        <button
          onClick={() => onFolderSelect("main")}
          className={`w-full flex items-center gap-2 py-2 px-3 rounded hover:bg-zinc-800/30 mb-2 ${
            selectedFolderId === "main" ? "bg-zinc-800/50 border border-white/20" : ""
          }`}
        >
          <Folder className="h-4 w-4 text-zinc-400" />
          <span className="text-sm text-zinc-300">Main</span>
        </button>
      </div>

      {/* Folder Tree */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-zinc-500 text-sm">Loading folders...</div>
        ) : folders.length === 0 ? (
          <div className="p-4 text-center text-zinc-500 text-sm">No folders created</div>
        ) : (
          <div className="py-2">{folders.map((folder) => renderFolder(folder))}</div>
        )}
      </div>

      {/* Create Root Folder */}
      <div className="p-3 border-t border-zinc-800/50">
        {creatingFolder === "root" ? (
          <div className="flex items-center gap-2">
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="New folder name"
              className="h-8 text-xs bg-zinc-900 border-zinc-700 text-white"
              onKeyDown={(e) => {
                if (e.key === "Enter") createFolder(null)
                if (e.key === "Escape") {
                  setCreatingFolder(null)
                  setNewFolderName("")
                }
              }}
              autoFocus
            />
            <Button
              size="sm"
              onClick={() => createFolder(null)}
              className="h-8 px-3 bg-white text-black hover:bg-zinc-200"
            >
              Create
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCreatingFolder("root")}
            className="w-full h-8 border-zinc-700 bg-zinc-900/50 hover:bg-zinc-800/50 text-zinc-300"
          >
            <Plus className="h-3 w-3 mr-2" />
            New Folder
          </Button>
        )}
      </div>
    </div>
  )
}
