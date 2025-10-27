"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { auth, db } from "@/lib/firebase"
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore"
import { Folder, FolderOpen, Loader2, Move } from "lucide-react"
import { cn } from "@/lib/utils"

interface FolderItem {
  id: string
  name: string
  path: string
  parentId: string | null
  level: number
}

interface MoveFilesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedFileIds: string[]
  onMoveComplete?: () => void
}

export default function MoveFilesDialog({ open, onOpenChange, selectedFileIds, onMoveComplete }: MoveFilesDialogProps) {
  const [folders, setFolders] = useState<FolderItem[]>([])
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [isMoving, setIsMoving] = useState(false)
  const { toast } = useToast()

  // Load folders from Firebase
  useEffect(() => {
    const user = auth.currentUser
    if (!user || !open) return

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
        })
      })
      setFolders(folderData)
    })

    return () => unsubscribe()
  }, [open])

  const handleMoveFiles = async () => {
    const user = auth.currentUser
    if (!user || selectedFileIds.length === 0) return

    setIsMoving(true)

    try {
      const token = await user.getIdToken()
      const response = await fetch("/api/uploads/bulk-move", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          uploadIds: selectedFileIds,
          folderId: selectedFolderId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to move files")
      }

      const result = await response.json()

      toast({
        title: "Success",
        description: result.message,
      })

      onOpenChange(false)
      onMoveComplete?.()
    } catch (error) {
      console.error("Error moving files:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to move files",
        variant: "destructive",
      })
    } finally {
      setIsMoving(false)
    }
  }

  const selectedFolder = folders.find((f) => f.id === selectedFolderId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Move className="h-5 w-5" />
            Move Files
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Move {selectedFileIds.length} file{selectedFileIds.length !== 1 ? "s" : ""} to a folder.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-white">Select Destination</Label>

            {/* Root folder option */}
            <button
              onClick={() => setSelectedFolderId(null)}
              className={cn(
                "w-full p-3 text-left rounded-md border transition-colors",
                selectedFolderId === null
                  ? "border-white bg-zinc-800 text-white"
                  : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800",
              )}
            >
              <div className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                <span>Root Folder</span>
              </div>
            </button>

            {/* Folder list */}
            <div className="max-h-60 overflow-y-auto space-y-1">
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => setSelectedFolderId(folder.id)}
                  className={cn(
                    "w-full p-3 text-left rounded-md border transition-colors",
                    selectedFolderId === folder.id
                      ? "border-white bg-zinc-800 text-white"
                      : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800",
                  )}
                  style={{ paddingLeft: `${12 + folder.level * 20}px` }}
                >
                  <div className="flex items-center gap-2">
                    <Folder className="h-4 w-4" />
                    <span>{folder.name}</span>
                  </div>
                </button>
              ))}
            </div>

            {folders.length === 0 && (
              <div className="text-center py-8 text-zinc-500">
                <Folder className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No folders available</p>
                <p className="text-xs">Create a folder first to organize your files</p>
              </div>
            )}
          </div>

          {selectedFolder && (
            <div className="p-3 bg-zinc-800/50 rounded-md">
              <p className="text-sm text-zinc-400">Moving to:</p>
              <p className="text-white font-medium">{selectedFolder.name}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isMoving}
            className="border-zinc-700 hover:bg-zinc-800"
          >
            Cancel
          </Button>
          <Button onClick={handleMoveFiles} disabled={isMoving} className="bg-white text-black hover:bg-zinc-100">
            {isMoving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Moving...
              </>
            ) : (
              <>
                <Move className="h-4 w-4 mr-2" />
                Move Files
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
