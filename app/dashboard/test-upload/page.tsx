"use client"

import { useState, useRef } from "react"
import { useToast } from "@/hooks/use-toast"

export default function TestUploadPage() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [logs, setLogs] = useState([])
  const fileInputRef = useRef(null)
  const { toast } = useToast()

  const addLog = (message) => {
    setLogs((prev) => [...prev, `${new Date().toLocaleTimeString()} - ${message}`])
  }

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
      addLog(`File selected: ${e.target.files[0].name} (${(e.target.files[0].size / (1024 * 1024)).toFixed(2)} MB)`)
    }
  }

  const uploadFile = async (file, url) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open("PUT", url)
      xhr.setRequestHeader("Content-Type", file.type)

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100)
          setProgress(percentComplete)
          if (percentComplete % 10 === 0) {
            addLog(`Upload progress: ${percentComplete}%`)
          }
        }
      })

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          addLog("File uploaded successfully to R2")
          resolve()
        } else {
          const errorMsg = `Upload failed with status ${xhr.status}`
          addLog(`ERROR: ${errorMsg}`)
          reject(new Error(errorMsg))
        }
      }

      xhr.onerror = () => {
        const errorMsg = "Network error during upload"
        addLog(`ERROR: ${errorMsg}`)
        reject(new Error(errorMsg))
      }

      xhr.send(file)
    })
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload",
        variant: "destructive",
      })
      return
    }

    try {
      setIsUploading(true)
      setProgress(0)
      setLogs([])
      addLog("Starting upload process...")

      // Step 1: Get upload URL
      addLog("Requesting presigned URL...")
      const formData = new FormData()
      formData.append("filename", selectedFile.name)
      formData.append("contentType", selectedFile.type)

      const urlResponse = await fetch("/api/test-videos/get-upload-url", {
        method: "POST",
        body: formData,
      })

      if (!urlResponse.ok) {
        const errorData = await urlResponse.json()
        throw new Error(errorData.error || `Failed to get presigned URL: ${urlResponse.status}`)
      }

      const { url, key, fileId } = await urlResponse.json()
      addLog(`Got presigned URL for key: ${key}`)

      // Step 2: Upload file directly to R2
      addLog("Uploading file directly to R2...")
      await uploadFile(selectedFile, url)

      // Step 3: Complete the upload process
      addLog("Saving metadata...")
      const completeResponse = await fetch("/api/test-videos/complete-upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileId,
          key,
        }),
      })

      if (!completeResponse.ok) {
        const errorData = await completeResponse.json()
        throw new Error(errorData.error || "Failed to complete upload")
      }

      const result = await completeResponse.json()
      addLog("Upload completed successfully!")
      addLog(`Public URL: ${result.publicUrl}`)

      toast({
        title: "Upload Complete",
        description: "Your video has been uploaded successfully.",
      })
    } catch (error) {
      console.error("Upload error:", error)
      addLog(`ERROR: ${error.message}`)
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6 text-white">Simple Test Upload</h1>
      <p className="text-zinc-400 mb-6">This page bypasses authentication for testing purposes.</p>

      <div className="bg-zinc-800/30 rounded-lg p-6 mb-6">
        <div className="mb-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="video/*"
            className="block w-full text-sm text-zinc-400
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-zinc-700 file:text-white
              hover:file:bg-zinc-600"
          />
        </div>

        <button
          onClick={handleUpload}
          disabled={isUploading || !selectedFile}
          className={`px-4 py-2 rounded-md text-white font-medium ${
            isUploading || !selectedFile ? "bg-zinc-700 cursor-not-allowed" : "bg-red-500 hover:bg-red-600"
          }`}
        >
          {isUploading ? `Uploading... ${progress}%` : "Upload File"}
        </button>
      </div>

      <div className="bg-black rounded-lg p-4 border border-zinc-800">
        <h2 className="text-white font-medium mb-2">Logs:</h2>
        <div className="bg-zinc-900 p-4 rounded h-64 overflow-y-auto font-mono text-sm">
          {logs.length > 0 ? (
            logs.map((log, index) => (
              <div key={index} className={log.includes("ERROR") ? "text-red-400" : "text-green-400"}>
                {log}
              </div>
            ))
          ) : (
            <div className="text-zinc-500">No logs yet. Start an upload to see logs.</div>
          )}
        </div>
      </div>
    </div>
  )
}
