"use client"

import type React from "react"

import { useState, useRef } from "react"

export default function UploadTest() {
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<string>("")
  const [logs, setLogs] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const addLog = (message: string) => {
    setLogs((prev) => [...prev, `${new Date().toISOString().split("T")[1].split(".")[0]} - ${message}`])
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      addLog(`File selected: ${e.target.files[0].name} (${(e.target.files[0].size / 1024).toFixed(2)} KB)`)
    }
  }

  const handleUpload = async () => {
    if (!file) {
      addLog("No file selected")
      return
    }

    try {
      // Step 1: Get presigned URL
      addLog("Requesting presigned URL...")
      setStatus("Requesting presigned URL...")

      const presignedResponse = await fetch("/api/upload/get-presigned-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: "Test Upload",
          description: "Testing direct upload",
          isPremium: false,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
        }),
      })

      if (!presignedResponse.ok) {
        const errorText = await presignedResponse.text()
        throw new Error(`Failed to get presigned URL: ${presignedResponse.status} ${errorText}`)
      }

      const { presignedUrl, fileId, key } = await presignedResponse.json()
      addLog(`Got presigned URL for key: ${key}`)

      // Step 2: Upload directly to R2
      addLog("Uploading file directly to R2...")
      setStatus("Uploading to R2...")

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
      setStatus("Upload complete!")

      // Step 3: Save metadata
      addLog("Saving metadata...")
      setStatus("Saving metadata...")

      const metadataResponse = await fetch("/api/upload/save-metadata", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: "Test Upload",
          description: "Testing direct upload",
          isPremium: false,
          fileId,
          key,
          fileType: file.type,
          publicUrl: `${process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL || ""}/${key}`,
        }),
      })

      if (!metadataResponse.ok) {
        const errorText = await metadataResponse.text()
        throw new Error(`Failed to save metadata: ${metadataResponse.status} ${errorText}`)
      }

      addLog("Metadata saved successfully!")
      setStatus("Complete!")
    } catch (error) {
      console.error("Upload error:", error)
      addLog(`ERROR: ${error instanceof Error ? error.message : String(error)}`)
      setStatus("Failed")
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Upload Test Page</h1>

      <div className="mb-6">
        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="mb-4" />

        <button
          onClick={handleUpload}
          disabled={!file}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          Upload Directly to R2
        </button>

        {status && <div className="mt-4 p-3 bg-gray-100 rounded">Status: {status}</div>}
      </div>

      <div className="border rounded p-4 bg-black text-green-400 font-mono text-sm h-80 overflow-y-auto">
        <h2 className="text-white mb-2">Logs:</h2>
        {logs.map((log, i) => (
          <div key={i} className="mb-1">
            {log}
          </div>
        ))}
      </div>
    </div>
  )
}
