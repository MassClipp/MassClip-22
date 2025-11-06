"use client"
import { useState } from "react"
import type React from "react"

import { Button } from "@/components/ui/button"
import { Upload, Video, ImageIcon, Music, FileText, Lock } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

export function LandingUploadDemo() {
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ name: string; type: string; size: number }>>([])
  const router = useRouter()
  const { toast } = useToast()

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])

    if (uploadedFiles.length + files.length > 3) {
      toast({
        title: "Upload Limit Reached",
        description: "Sign up to upload unlimited files!",
        action: (
          <Button size="sm" onClick={() => router.push("/signup")} className="bg-teal-500">
            Sign Up
          </Button>
        ),
      })
      return
    }

    const newFiles = files.map((f) => ({
      name: f.name,
      type: f.type,
      size: f.size,
    }))

    setUploadedFiles((prev) => [...prev, ...newFiles])

    if (uploadedFiles.length + files.length >= 3) {
      setTimeout(() => {
        toast({
          title: "Ready for more?",
          description: "Sign up to upload unlimited content and start selling!",
          action: (
            <Button size="sm" onClick={() => router.push("/signup")} className="bg-teal-500">
              Sign Up Free
            </Button>
          ),
        })
      }, 1000)
    }
  }

  const getFileIcon = (type: string) => {
    if (type.startsWith("video")) return <Video className="w-5 h-5 text-teal-400" />
    if (type.startsWith("image")) return <ImageIcon className="w-5 h-5 text-blue-400" />
    if (type.startsWith("audio")) return <Music className="w-5 h-5 text-purple-400" />
    return <FileText className="w-5 h-5 text-gray-400" />
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-thin text-white">Upload Your Content</h2>
        <p className="text-white/60 font-light text-lg">Try uploading up to 3 files. Sign up for unlimited uploads.</p>
      </div>

      {/* Upload Area */}
      <div className="border-2 border-dashed border-white/20 rounded-2xl p-12 text-center hover:border-teal-400/50 transition-all bg-white/5">
        <input
          type="file"
          id="upload-demo"
          multiple
          accept="video/*,image/*,audio/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploadedFiles.length >= 3}
        />
        <label htmlFor="upload-demo" className={uploadedFiles.length >= 3 ? "cursor-not-allowed" : "cursor-pointer"}>
          <Upload className="w-16 h-16 text-white/40 mx-auto mb-4" />
          <p className="text-white text-lg font-light mb-2">
            {uploadedFiles.length >= 3 ? "Upload limit reached" : "Drop files here or click to upload"}
          </p>
          <p className="text-white/40 text-sm font-light">{uploadedFiles.length}/3 files uploaded (demo limit)</p>
        </label>
      </div>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-light text-lg">Uploaded Files</h3>
            <Button
              size="sm"
              onClick={() => router.push("/signup")}
              className="bg-teal-500 hover:bg-teal-600 text-white"
            >
              <Lock className="w-4 h-4 mr-2" />
              Sign Up to Save
            </Button>
          </div>

          <div className="grid gap-3">
            {uploadedFiles.map((file, i) => (
              <div key={i} className="bg-white/5 rounded-xl p-4 border border-white/10 flex items-center gap-4">
                {getFileIcon(file.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-light truncate">{file.name}</p>
                  <p className="text-white/40 text-sm">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <div className="text-teal-400 text-sm font-light">Uploaded</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Features */}
      <div className="grid md:grid-cols-3 gap-6 pt-8">
        {[
          { title: "HD Quality", desc: "All uploads preserved in original quality" },
          { title: "Auto Organization", desc: "VEX organizes your content automatically" },
          { title: "Instant Selling", desc: "Create bundles and start selling immediately" },
        ].map((feature, i) => (
          <div key={i} className="bg-white/5 rounded-xl p-6 border border-white/10 text-center">
            <h4 className="text-white font-light mb-2">{feature.title}</h4>
            <p className="text-white/60 text-sm font-light">{feature.desc}</p>
          </div>
        ))}
      </div>

      <div className="text-center pt-8">
        <Button
          onClick={() => router.push("/signup")}
          className="bg-white text-black hover:bg-white/90 font-light px-12 py-6 text-lg rounded-full"
        >
          Sign Up for Unlimited Uploads
        </Button>
      </div>
    </div>
  )
}
