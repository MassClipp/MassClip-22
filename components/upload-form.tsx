"use client"

import { useState, useRef, type ChangeEvent, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Video, Upload, User, Lock, DollarSign } from "lucide-react"
import { cn } from "@/lib/utils"

export default function UploadForm() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form state
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [isPremium, setIsPremium] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  // Handle file selection
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!selectedFile || !title.trim()) {
      return
    }

    setIsUploading(true)

    // Simulate upload
    setTimeout(() => {
      setIsUploading(false)
      router.push("/dashboard")
    }, 2000)
  }

  // Toggle between free and premium
  const togglePremium = () => {
    setIsPremium(!isPremium)
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-center text-white mb-6">Upload Your Content</h1>

      <div className="bg-black border border-zinc-800 rounded-lg overflow-hidden">
        <div className="p-6 border-b border-zinc-800 flex items-center">
          <Video className="h-5 w-5 text-red-500 mr-2" />
          <h2 className="text-xl font-semibold text-white">Upload Content</h2>
        </div>

        <div className="p-1 border-b border-zinc-800 flex items-center text-sm text-zinc-400 px-6">
          <User className="h-3.5 w-3.5 mr-2" />
          <span>
            Uploading as <span className="text-red-500">@jus</span>
          </span>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Content Type Toggle */}
          <div className="mb-6">
            <div className="flex justify-center space-x-2 w-full">
              <button
                type="button"
                onClick={() => setIsPremium(false)}
                className={cn(
                  "py-2 px-4 rounded-l-md flex-1 flex items-center justify-center gap-2 transition-colors",
                  !isPremium ? "bg-red-600 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700",
                )}
              >
                <span>Free</span>
              </button>
              <button
                type="button"
                onClick={() => setIsPremium(true)}
                className={cn(
                  "py-2 px-4 rounded-r-md flex-1 flex items-center justify-center gap-2 transition-colors",
                  isPremium ? "bg-amber-500 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700",
                )}
              >
                <Lock className="h-4 w-4" />
                <span>Premium</span>
              </button>
            </div>

            {isPremium && (
              <div className="mt-3 p-3 bg-zinc-800/30 border border-amber-500/20 rounded text-sm text-zinc-400 flex items-start">
                <DollarSign className="h-4 w-4 text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
                <p>
                  Premium videos will be available only to paying subscribers. Price is set in your profile settings.
                </p>
              </div>
            )}
          </div>

          {/* Video File */}
          <div className="mb-6">
            <label className="block text-white mb-2">Video File</label>
            <div
              className="border-2 border-dashed border-zinc-700 rounded-lg p-8 text-center cursor-pointer hover:bg-zinc-800/30"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="flex flex-col items-center">
                <Upload className="h-10 w-10 text-zinc-500 mb-2" />
                <p className="text-white">Click to upload video</p>
                <p className="text-xs text-zinc-500 mt-1">MP4, MOV or WebM (Max 500MB)</p>
              </div>
              <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={handleFileChange} />
            </div>
            {selectedFile && <p className="mt-2 text-sm text-zinc-400">{selectedFile.name}</p>}
          </div>

          {/* Title */}
          <div className="mb-6">
            <label htmlFor="title" className="block text-white mb-2">
              Title
            </label>
            <input
              id="title"
              type="text"
              placeholder="Enter a title for your video"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-md p-3 text-white focus:outline-none focus:ring-1 focus:ring-red-500"
              required
            />
          </div>

          {/* Description */}
          <div className="mb-6">
            <label htmlFor="description" className="block text-white mb-2">
              Description (Optional)
            </label>
            <textarea
              id="description"
              placeholder="Describe your video"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-md p-3 text-white focus:outline-none focus:ring-1 focus:ring-red-500 resize-none"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isUploading || !selectedFile || !title.trim()}
            className={cn(
              "w-full py-3 rounded-md font-medium text-white transition-colors",
              isPremium ? "bg-amber-500 hover:bg-amber-600" : "bg-red-600 hover:bg-red-700",
              (isUploading || !selectedFile || !title.trim()) && "opacity-50 cursor-not-allowed",
            )}
          >
            {isUploading ? "Uploading..." : isPremium ? "Publish Premium Video" : "Publish Video"}
          </button>
        </form>
      </div>
    </div>
  )
}
