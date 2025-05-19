"use client"

import type React from "react"

import { useState, useRef } from "react"
import { v4 as uuidv4 } from "uuid"

// Direct S3 client implementation for the client side
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

export default function DirectUploadTest() {
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<string>("")
  const [logs, setLogs] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const addLog = (message: string) => {
    setLogs((prev) => [...prev, `${new Date().toISOString().split("T")[1].split(".")[0]} - ${message}`])
    console.log(message)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      addLog(`File selected: ${e.target.files[0].name} (${(e.target.files[0].size / 1024 / 1024).toFixed(2)} MB)`)
    }
  }

  const handleDirectUpload = async () => {
    if (!file) {
      addLog("No file selected")
      return
    }

    try {
      addLog("Starting direct upload process...")
      setStatus("Starting...")

      // Generate a unique file ID and key
      const fileId = uuidv4()
      const username = "test-user"
      const key = `test-uploads/${username}/${fileId}-${file.name}`

      addLog(`Generated file key: ${key}`)

      // Create S3 client for Cloudflare R2
      const s3Client = new S3Client({
        region: "auto",
        endpoint: "https://c2c9e1c9e1e5e5e5e5e5e5e5e5e5e5e5.r2.cloudflarestorage.com", // Replace with your actual endpoint
        credentials: {
          accessKeyId: "test-access-key", // Replace with your actual access key
          secretAccessKey: "test-secret-key", // Replace with your actual secret key
        },
      })

      addLog("Created S3 client")

      // Create a presigned URL for uploading
      const command = new PutObjectCommand({
        Bucket: "massclip", // Replace with your actual bucket name
        Key: key,
        ContentType: file.type,
      })

      addLog("Generating presigned URL...")
      const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 })
      addLog("Generated presigned URL")

      // Upload the file directly to R2
      addLog("Uploading file directly to R2...")
      setStatus("Uploading...")

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
    } catch (error) {
      console.error("Upload error:", error)
      addLog(`ERROR: ${error instanceof Error ? error.message : String(error)}`)
      setStatus("Failed")
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Direct Upload Test</h1>
      <p className="mb-4 text-red-500">
        Note: This is a client-side only test. Replace the placeholder credentials with your actual R2 credentials.
      </p>

      <div className="mb-6">
        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="mb-4" />

        <button
          onClick={handleDirectUpload}
          disabled={!file}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          Test Direct Upload
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
