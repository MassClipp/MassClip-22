"use client"

import type React from "react"

import { useState, useRef } from "react"

export default function SimpleUploadTest() {
  const [file, setFile] = useState<File | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const addLog = (message: string) => {
    const timestamp = new Date().toTimeString().split(" ")[0]
    setLogs((prev) => [...prev, `${timestamp} - ${message}`])
    console.log(message)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      setFile(selectedFile)
      addLog(`File selected: ${selectedFile.name} (${(selectedFile.size / 1024 / 1024).toFixed(2)} MB)`)
    }
  }

  const handleUpload = async () => {
    if (!file) {
      addLog("No file selected")
      return
    }

    try {
      setIsUploading(true)
      addLog("Step 1: Getting presigned URL from server...")

      // Step 1: Get a presigned URL from the server
      const getUrlResponse = await fetch("/api/simple-upload/get-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
        }),
      })

      if (!getUrlResponse.ok) {
        const errorData = await getUrlResponse.json()
        throw new Error(`Failed to get presigned URL: ${getUrlResponse.status} ${JSON.stringify(errorData)}`)
      }

      const { presignedUrl, key } = await getUrlResponse.json()
      addLog(`Got presigned URL for key: ${key}`)

      // Step 2: Upload the file directly to R2 using the presigned URL
      addLog("Step 2: Uploading file directly to R2...")
      const uploadResponse = await fetch(presignedUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      })

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`)
      }

      addLog("File uploaded successfully!")

      // Step 3: Notify the server that the upload is complete
      addLog("Step 3: Saving metadata...")
      const completeResponse = await fetch("/api/simple-upload/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          key,
          fileName: file.name,
          fileSize: file.size,
          contentType: file.type,
        }),
      })

      if (!completeResponse.ok) {
        const errorData = await completeResponse.json()
        throw new Error(`Failed to save metadata: ${completeResponse.status} ${JSON.stringify(errorData)}`)
      }

      const completeData = await completeResponse.json()
      addLog(`Metadata saved successfully! Public URL: ${completeData.publicUrl}`)
    } catch (error) {
      console.error("Upload error:", error)
      addLog(`ERROR: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsUploading(false)
    }
  }

  const clearLogs = () => {
    setLogs([])
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Simple Upload Test</h1>
      <p className="mb-4">This test uses server-side presigned URL generation.</p>

      <div className="mb-6">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="mb-4 block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-md file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100"
        />

        <div className="flex space-x-4">
          <button
            onClick={handleUpload}
            disabled={!file || isUploading}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            {isUploading ? "Uploading..." : "Upload File"}
          </button>

          <button onClick={clearLogs} className="px-4 py-2 bg-gray-600 text-white rounded">
            Clear Logs
          </button>
        </div>
      </div>

      <div className="border rounded p-4 bg-black text-green-400 font-mono text-sm h-80 overflow-y-auto">
        <h2 className="text-white mb-2">Logs:</h2>
        {logs.length === 0 ? (
          <div className="text-gray-500">No logs yet. Start an upload to see logs here.</div>
        ) : (
          logs.map((log, i) => (
            <div key={i} className="mb-1">
              {log}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
