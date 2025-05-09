"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, Upload } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"

export default function SimpleUploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const [vimeoId, setVimeoId] = useState<string | null>(null)
  const { user } = useAuth()
  const { toast } = useToast()

  const addLog = useCallback((message: string) => {
    console.log(message)
    setLogs((prev) => [...prev, `[${new Date().toISOString()}] ${message}`])
  }, [])

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0]
        setSelectedFile(file)
        addLog(`File selected: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`)
      }
    },
    [addLog],
  )

  const uploadToVimeo = useCallback(async () => {
    if (!selectedFile || !user) {
      toast({
        title: "Error",
        description: "Please select a file and ensure you're logged in",
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)
    setUploadProgress(0)
    addLog("Starting upload process...")

    try {
      // Step 1: Initialize the upload
      addLog("Initializing upload with Vimeo API...")
      const formData = new FormData()
      formData.append("name", selectedFile.name)
      formData.append("description", "Uploaded via simple test page")
      formData.append("size", selectedFile.size.toString())
      formData.append("userId", user.uid)
      formData.append("niche", "motivation") // Default niche for testing

      const initResponse = await fetch("/api/vimeo/upload", {
        method: "POST",
        body: formData,
      })

      if (!initResponse.ok) {
        const errorData = await initResponse.json()
        throw new Error(errorData.details || "Failed to initialize upload")
      }

      const vimeoData = await initResponse.json()
      addLog(`Upload initialized. Vimeo ID: ${vimeoData.vimeoId}`)
      setVimeoId(vimeoData.vimeoId)

      // Step 2: Upload the file using XMLHttpRequest for progress tracking
      addLog(`Starting file upload to ${vimeoData.uploadUrl.substring(0, 30)}...`)

      const fileFormData = new FormData()
      fileFormData.append("file_data", selectedFile)

      const xhr = new XMLHttpRequest()

      // Set up progress tracking
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentage = (event.loaded / event.total) * 100
          setUploadProgress(percentage)
          if (percentage % 10 < 1) {
            // Log every ~10%
            addLog(`Upload progress: ${percentage.toFixed(0)}%`)
          }
        }
      }

      // Create a promise to handle the XHR request
      await new Promise<void>((resolve, reject) => {
        xhr.open("POST", vimeoData.uploadUrl, true)

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            addLog(`Upload completed with status: ${xhr.status}`)
            resolve()
          } else {
            const error = `Upload failed with status ${xhr.status}: ${xhr.statusText}`
            addLog(`ERROR: ${error}`)
            reject(new Error(error))
          }
        }

        xhr.onerror = () => {
          const error = "Network error during upload"
          addLog(`ERROR: ${error}`)
          reject(new Error(error))
        }

        xhr.send(fileFormData)
      })

      addLog("Upload completed successfully!")
      toast({
        title: "Upload complete",
        description: "Your video has been uploaded to Vimeo",
      })
    } catch (error) {
      addLog(`ERROR: ${error instanceof Error ? error.message : String(error)}`)
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }, [selectedFile, user, addLog, toast])

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-zinc-800/50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back to Dashboard</span>
          </Link>
          <h1 className="text-lg font-medium">Simple Upload Test</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-24 pb-16 max-w-5xl">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-medium mb-4">Super Simple Upload</h2>
          <p className="text-sm text-zinc-400 mb-6">
            This is a minimal implementation to test uploads without any extra features.
          </p>

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <input type="file" id="simple-file" onChange={handleFileChange} className="hidden" accept="video/*" />
              <Button
                onClick={() => document.getElementById("simple-file")?.click()}
                variant="outline"
                className="flex-1"
                disabled={isUploading}
              >
                Select Video File
              </Button>
              <Button
                onClick={uploadToVimeo}
                disabled={!selectedFile || isUploading}
                className="flex-1 bg-crimson hover:bg-crimson-dark"
              >
                <Upload className="w-4 h-4 mr-2" />
                {isUploading ? "Uploading..." : "Upload to Vimeo"}
              </Button>
            </div>

            {selectedFile && (
              <div className="text-sm">
                <p>
                  <span className="text-zinc-500">File:</span> {selectedFile.name}
                </p>
                <p>
                  <span className="text-zinc-500">Size:</span> {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                </p>
                <p>
                  <span className="text-zinc-500">Type:</span> {selectedFile.type}
                </p>
              </div>
            )}

            {isUploading && (
              <div>
                <Progress value={uploadProgress} className="h-2 mb-2" />
                <p className="text-sm text-center">
                  {uploadProgress.toFixed(0)}% -{" "}
                  {(((selectedFile?.size || 0) / 1024 / 1024) * (uploadProgress / 100)).toFixed(2)} MB uploaded
                </p>
              </div>
            )}

            {vimeoId && (
              <div className="bg-green-900/20 border border-green-900/50 rounded-lg p-4">
                <p className="text-green-500">Upload initialized with Vimeo ID: {vimeoId}</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-xl font-medium mb-4">Upload Logs</h2>
          <div className="bg-black/50 border border-zinc-800 rounded-lg p-4 h-[300px] overflow-y-auto font-mono text-xs">
            {logs.length === 0 ? (
              <p className="text-zinc-500">No logs yet. Start an upload to see logs.</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log.includes("ERROR") ? (
                    <p className="text-red-500">{log}</p>
                  ) : log.includes("progress") ? (
                    <p className="text-blue-400">{log}</p>
                  ) : log.includes("completed") || log.includes("success") ? (
                    <p className="text-green-500">{log}</p>
                  ) : (
                    <p className="text-zinc-400">{log}</p>
                  )}
                </div>
              ))
            )}
          </div>
          <div className="flex justify-end mt-4">
            <Button onClick={() => setLogs([])} variant="outline" size="sm">
              Clear Logs
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
