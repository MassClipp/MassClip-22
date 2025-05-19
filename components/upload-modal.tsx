"use client"
import { useEffect, useRef } from "react"
import SimpleUploadForm from "./simple-upload-form"

interface UploadModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function UploadModal({ isOpen, onClose }: UploadModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      // Prevent body scrolling when modal is open
      document.body.style.overflow = "hidden"
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.body.style.overflow = "auto"
    }
  }, [isOpen, onClose])

  // Handle escape key press
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEscKey)
    }

    return () => {
      document.removeEventListener("keydown", handleEscKey)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div ref={modalRef} className="bg-zinc-900 rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-end p-4">
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white h-8 w-8 flex items-center justify-center rounded-full hover:bg-zinc-800"
          >
            ✕
          </button>
        </div>
        <SimpleUploadForm />
      </div>
    </div>
  )
}
