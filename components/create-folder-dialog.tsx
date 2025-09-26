"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import { Folder, Loader2 } from "lucide-react"

interface CreateFolderDialogProps {
  isOpen: boolean
  onClose: () => void
  parentFolderId?: string | null
  onFolderCreated?: (folderId: string) => void
}

export function CreateFolderDialog({
  isOpen,
  onClose,
  parentFolderId = null,
  onFolderCreated,
}: CreateFolderDialogProps) {
  const [folderName, setFolderName] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const { toast } = useToast()
  const { user } = useFirebaseAuth()

  const handleCreateFolder = async () => {
    if (!folderName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a folder name",
        variant: "destructive",
      })
      return
    }

    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create folders",
        variant: "destructive",
      })
      return
    }

    setIsCreating(true)

    try {
      const token = await user.getIdToken()
      const response = await fetch("/api/folders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: folderName.trim(),
          parentId: parentFolderId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create folder")
      }

      const { folder } = await response.json()

      toast({
        title: "Success",
        description: `Folder "${folderName}" created successfully`,
      })

      setFolderName("")
      onClose()
      onFolderCreated?.(folder.id)
    } catch (error) {
      console.error("Error creating folder:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create folder",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isCreating) {
      handleCreateFolder()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-zinc-900 border-zinc-800 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Folder className="h-5 w-5" />
            Create New Folder
          </DialogTitle>
          <DialogDescription className="text-zinc-400">Create a new folder to organize your uploads.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="folder-name" className="text-white">
              Folder Name
            </Label>
            <Input
              id="folder-name"
              placeholder="Enter folder name..."
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              onKeyDown={handleKeyDown}
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
              disabled={isCreating}
              autoFocus
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isCreating}
            className="border-zinc-700 hover:bg-zinc-800 bg-transparent"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateFolder}
            disabled={isCreating || !folderName.trim()}
            className="bg-white text-black hover:bg-zinc-100"
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Folder className="h-4 w-4 mr-2" />
                Create Folder
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default CreateFolderDialog
