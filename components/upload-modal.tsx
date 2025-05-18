"use client"
import SimpleUploadForm from "./simple-upload-form"

interface UploadModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function UploadModal({ isOpen, onClose }: UploadModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-zinc-900 rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-end p-4">
          <button onClick={onClose} className="text-zinc-400 hover:text-white">
            ✕
          </button>
        </div>
        <SimpleUploadForm />
      </div>
    </div>
  )
}
