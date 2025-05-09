"use client"

import { useState } from "react"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"

interface DeleteConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (deleteFromVimeo: boolean) => Promise<void>
  title: string
  description: string
  showVimeoOption?: boolean
}

export function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  showVimeoOption = false,
}: DeleteConfirmationModalProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteFromVimeo, setDeleteFromVimeo] = useState(true)

  if (!isOpen) return null

  const handleConfirm = async () => {
    setIsDeleting(true)
    try {
      await onConfirm(deleteFromVimeo)
    } catch (error) {
      console.error("Error during deletion:", error)
    } finally {
      setIsDeleting(false)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-red-500/20 p-2 rounded-full">
            <AlertTriangle className="h-6 w-6 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-white">{title}</h2>
        </div>

        <p className="text-zinc-400 mb-4">{description}</p>

        {showVimeoOption && (
          <div className="flex items-center space-x-2 mb-6">
            <Checkbox
              id="delete-from-vimeo"
              checked={deleteFromVimeo}
              onCheckedChange={(checked) => setDeleteFromVimeo(checked as boolean)}
            />
            <label
              htmlFor="delete-from-vimeo"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-zinc-300"
            >
              Also delete from Vimeo (recommended)
            </label>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
            className="border-zinc-700 hover:bg-zinc-800 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </div>
    </div>
  )
}
