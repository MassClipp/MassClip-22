"use client"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface DownloadConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  remainingDownloads: number
  isMobile?: boolean
}

export function DownloadConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  remainingDownloads,
  isMobile = false,
}: DownloadConfirmationModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm Download</DialogTitle>
          <DialogDescription>This will count as 1 of your 5 monthly downloads.</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            Free users are limited to 5 downloads per month. You have {remainingDownloads} downloads remaining.
          </p>

          {isMobile && (
            <p className="text-sm text-muted-foreground mt-2">
              The video will open in a new tab. Press and hold on the video to save it to your device.
            </p>
          )}
        </div>
        <DialogFooter className="flex space-x-2 sm:justify-end">
          <Button variant="outline" onClick={onClose}>
            No, Cancel
          </Button>
          <Button onClick={onConfirm}>Yes, Download</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
