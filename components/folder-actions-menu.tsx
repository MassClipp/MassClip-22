"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { MoreHorizontal, Edit2, Trash2 } from "lucide-react"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import { useToast } from "@/hooks/use-toast"

interface FolderActionsMenuProps {
  folderId: string
  folderName: string
  onFolderUpdated: () => void
}

export default function FolderActionsMenu({ folderId, folderName, onFolderUpdated }: FolderActionsMenuProps) {
  const { user } = useFirebaseAuth()
  const { toast } = useToast()
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [newName, setNewName] = useState(folderName)
  const [loading, setLoading] = useState(false)

  const handleRename = async () => {
    if (!user || !newName.trim()) return

    setLoading(true)
    try {
      const token = await user.getIdToken()
      const response = await fetch(`/api/folders/${folderId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newName.trim(),
        }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Folder renamed successfully",
        })
        setIsRenameDialogOpen(false)
        onFolderUpdated()
      } else {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.error || "Failed to rename folder",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Failed to rename folder:", error)
      toast({
        title: "Error",
        description: "Failed to rename folder",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!user) return

    setLoading(true)
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
          title: "Success",
          description: "Folder deleted successfully",
        })
        setIsDeleteDialogOpen(false)
        onFolderUpdated()
      } else {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.error || "Failed to delete folder",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Failed to delete folder:", error)
      toast({
        title: "Error",
        description: "Failed to delete folder",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:bg-zinc-700/50"
          >
            <MoreHorizontal className="h-3 w-3 text-zinc-400" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-700">
          <DropdownMenuItem
            onClick={() => {
              setNewName(folderName)
              setIsRenameDialogOpen(true)
            }}
            className="text-zinc-300 hover:bg-zinc-800 focus:bg-zinc-800"
          >
            <Edit2 className="h-3 w-3 mr-2" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setIsDeleteDialogOpen(true)}
            className="text-red-400 hover:bg-red-900/20 focus:bg-red-900/20"
          >
            <Trash2 className="h-3 w-3 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Rename Dialog */}
      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-700">
          <DialogHeader>
            <DialogTitle className="text-white">Rename Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Folder name"
              className="bg-zinc-800 border-zinc-700 text-white"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRename()
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRenameDialogOpen(false)}
              className="border-zinc-700 text-zinc-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRename}
              disabled={loading || !newName.trim()}
              className="bg-white text-black hover:bg-zinc-200"
            >
              {loading ? "Renaming..." : "Rename"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-700">
          <DialogHeader>
            <DialogTitle className="text-white">Delete Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-zinc-300 text-sm">
              Are you sure you want to delete "{folderName}"? This action cannot be undone.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              className="border-zinc-700 text-zinc-300"
            >
              Cancel
            </Button>
            <Button onClick={handleDelete} disabled={loading} variant="destructive">
              {loading ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
