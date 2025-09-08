"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Folder, FolderPlus, ChevronRight, Home, MoreVertical, Edit, Trash2, ArrowLeft } from "lucide-react"
import { auth, db } from "@/lib/firebase"
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface FolderItem {
  id: string
  name: string
  path: string
  parentId: string | null
  level: number
  fileCount?: number
}

interface FolderNavigationProps {
  currentFolderId?: string | null
  onFolderChange?: (folderId: string | null) => void
  showCreateButton?: boolean
  onCreateFolder?: () => void
  className?: string
}

export default function FolderNavigation({
  currentFolderId,
  onFolderChange,
  showCreateButton = true,
  onCreateFolder,
  className,
}: FolderNavigationProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [folders, setFolders] = useState<FolderItem[]>([])
  const [currentFolder, setCurrentFolder] = useState<FolderItem | null>(null)
  const [breadcrumbs, setBreadcrumbs] = useState<FolderItem[]>([])

  // Load folders from Firebase
  useEffect(() => {
    const user = auth.currentUser
    if (!user) return

    const foldersQuery = query(
      collection(db, "folders"),
      where("uid", "==", user.uid),
      where("isDeleted", "==", false),
      orderBy("path", "asc"),
    )

    const unsubscribe = onSnapshot(foldersQuery, (snapshot) => {
      const folderData: FolderItem[] = []
      snapshot.forEach((doc) => {
        const data = doc.data()
        folderData.push({
          id: doc.id,
          name: data.name,
          path: data.path,
          parentId: data.parentId || null,
          level: data.level || 0,
          fileCount: data.fileCount || 0,
        })
      })
      setFolders(folderData)
    })

    return () => unsubscribe()
  }, [])

  // Update current folder and breadcrumbs when currentFolderId changes
  useEffect(() => {
    if (currentFolderId) {
      const folder = folders.find((f) => f.id === currentFolderId)
      setCurrentFolder(folder || null)

      // Build breadcrumbs
      if (folder) {
        const crumbs: FolderItem[] = []
        let current = folder

        while (current) {
          crumbs.unshift(current)
          current = folders.find((f) => f.id === current.parentId) || null
        }

        setBreadcrumbs(crumbs)
      }
    } else {
      setCurrentFolder(null)
      setBreadcrumbs([])
    }
  }, [currentFolderId, folders])

  // Get child folders of current folder
  const getChildFolders = (parentId: string | null) => {
    return folders.filter((f) => f.parentId === parentId)
  }

  const handleFolderClick = (folderId: string | null) => {
    onFolderChange?.(folderId)

    // Update URL if we're in a route that supports folder navigation
    const currentPath = window.location.pathname
    if (currentPath.includes("/dashboard/uploads") || currentPath.includes("/dashboard/free-content")) {
      const params = new URLSearchParams(searchParams.toString())
      if (folderId) {
        params.set("folder", folderId)
      } else {
        params.delete("folder")
      }
      router.push(`${currentPath}?${params.toString()}`)
    }
  }

  const handleFolderAction = async (action: string, folderId: string) => {
    const user = auth.currentUser
    if (!user) return

    try {
      const token = await user.getIdToken()

      if (action === "delete") {
        const response = await fetch(`/api/folders/${folderId}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          throw new Error("Failed to delete folder")
        }
      }
    } catch (error) {
      console.error(`Error ${action} folder:`, error)
    }
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Breadcrumbs */}
      {breadcrumbs.length > 0 && (
        <div className="flex items-center space-x-2 text-sm text-zinc-400">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleFolderClick(null)}
            className="h-8 px-2 text-zinc-400 hover:text-white"
          >
            <Home className="h-4 w-4" />
          </Button>

          {breadcrumbs.map((crumb, index) => (
            <div key={crumb.id} className="flex items-center space-x-2">
              <ChevronRight className="h-4 w-4" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleFolderClick(crumb.id)}
                className="h-8 px-2 text-zinc-400 hover:text-white"
              >
                {crumb.name}
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Current folder header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {currentFolder && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const parentFolder = folders.find((f) => f.id === currentFolder.parentId)
                handleFolderClick(parentFolder?.id || null)
              }}
              className="h-8 px-2 text-zinc-400 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}

          <div className="flex items-center space-x-2">
            <Folder className="h-5 w-5 text-zinc-400" />
            <h2 className="text-lg font-medium text-white">{currentFolder ? currentFolder.name : "All Files"}</h2>
            {currentFolder?.fileCount !== undefined && (
              <Badge variant="outline" className="text-xs border-zinc-700 text-zinc-400">
                {currentFolder.fileCount} files
              </Badge>
            )}
          </div>
        </div>

        {showCreateButton && (
          <Button
            onClick={onCreateFolder}
            variant="outline"
            size="sm"
            className="border-zinc-700 hover:bg-zinc-800 bg-transparent"
          >
            <FolderPlus className="h-4 w-4 mr-2" />
            New Folder
          </Button>
        )}
      </div>

      {/* Child folders grid */}
      {getChildFolders(currentFolderId || null).length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {getChildFolders(currentFolderId || null).map((folder) => (
            <div
              key={folder.id}
              className="group relative bg-zinc-900/30 border border-zinc-800/30 rounded-lg p-3 hover:border-zinc-700/50 transition-all cursor-pointer"
              onClick={() => handleFolderClick(folder.id)}
            >
              <div className="flex flex-col items-center space-y-2">
                <Folder className="h-8 w-8 text-zinc-400 group-hover:text-white transition-colors" />
                <div className="text-center">
                  <p className="text-sm font-medium text-white truncate w-full">{folder.name}</p>
                  {folder.fileCount !== undefined && <p className="text-xs text-zinc-500">{folder.fileCount} files</p>}
                </div>
              </div>

              {/* Folder actions */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-zinc-400 hover:text-white"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-zinc-900 border-zinc-800">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        // TODO: Open rename dialog
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        handleFolderAction("delete", folder.id)
                      }}
                      className="text-red-400"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
