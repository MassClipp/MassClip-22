"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, Upload, FileVideo, AlertCircle } from "lucide-react"
import Link from "next/link"

export default function UploadDiagnosticPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStage, setUploadStage] = useState<"idle" | "uploading" | "complete" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [logs, setLogs] = useState<string[]>([])

  const addLog = useCallback((message: string) => {
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

  const testDirectUpload = useCallback(async () => {
    if (!selectedFile) return

    setIsUploading(true)
    setUploadProgress(0)
    setUploadStage("uploading")
    setErrorMessage(null)
    addLog("Starting direct upload test...")

    try {
      // Create a mock upload endpoint
      const mockUploadUrl = "https://httpbin.org/post"
      addLog(`Using mock upload endpoint: ${mockUploadUrl}`)

      // Create a FormData object to send the file
      const formData = new FormData()
      formData.append("file", selectedFile)
      addLog("FormData created with file")

      // Use XMLHttpRequest for better control over the upload process
      const xhr = new XMLHttpRequest()
      addLog("XMLHttpRequest created")

      // Set up progress tracking
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentage = (event.loaded / event.total) * 100
          addLog(`Upload progress: ${percentage.toFixed(2)}% (${event.loaded}/${event.total} bytes)`)
          setUploadProgress(percentage)
        }
      }

      // Create a promise to handle the XHR request
      await new Promise<void>((resolve, reject) => {
        xhr.open("POST", mockUploadUrl, true)
        addLog("XMLHttpRequest opened")

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            addLog(`Upload completed successfully with status: ${xhr.status}`)
            setUploadStage("complete")
            setUploadProgress(100)
            resolve()
          } else {
            const error = `Upload failed with status ${xhr.status}: ${xhr.statusText}`
            addLog(`ERROR: ${error}`)
            setUploadStage("error")
            setErrorMessage(error)
            reject(new Error(error))
          }
        }

        xhr.onerror = () => {
          const error = "Network error during upload"
          addLog(`ERROR: ${error}`)
          setUploadStage("error")
          setErrorMessage(error)
          reject(new Error(error))
        }

        xhr.onabort = () => {
          addLog("Upload was aborted")
          setUploadStage("error")
          setErrorMessage("Upload aborted")
          reject(new Error("Upload aborted"))
        }

        // Log when upload starts
        addLog("Sending upload request...")
        xhr.send(formData)
      })

      addLog("Upload test completed successfully")
    } catch (error) {
      addLog(`ERROR: ${error instanceof Error ? error.message : String(error)}`)
      setUploadStage("error")
      setErrorMessage(error instanceof Error ? error.message : String(error))
    } finally {
      setIsUploading(false)
    }
  }, [selectedFile, addLog])

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-zinc-800/50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back to Dashboard</span>
          </Link>
          <h1 className="text-lg font-medium">Upload Diagnostics</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-24 pb-16 max-w-5xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
              <h2 className="text-xl font-medium mb-4">Upload Test</h2>
              <p className="text-sm text-zinc-400 mb-6">
                This tool helps diagnose upload issues by testing your connection with a mock server.
              </p>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    id="test-file"
                    onChange={handleFileChange}
                    className="hidden"
                    accept="video/*,image/*"
                  />
                  <Button
                    onClick={() => document.getElementById("test-file")?.click()}
                    variant="outline"
                    className="flex-1"
                  >
                    <FileVideo className="w-4 h-4 mr-2" />
                    Select Test File
                  </Button>
                  <Button
                    onClick={testDirectUpload}
                    disabled={!selectedFile || isUploading}
                    className="flex-1 bg-crimson hover:bg-crimson-dark"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Test Upload
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
                      {((selectedFile?.size || 0) / (1024 * 1024) / 100) * uploadProgress} MB
                    </p>
                  </div>
                )}

                {uploadStage === "error" && (
                  <div className="bg-red-900/20 border border-red-900/50 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-red-500">Upload Error</p>
                        <p className="text-sm text-zinc-400">{errorMessage}</p>
                      </div>
                    </div>
                  </div>
                )}

                {uploadStage === "complete" && (
                  <div className="bg-green-900/20 border border-green-900/50 rounded-lg p-4">
                    <p className="text-green-500">Upload test completed successfully!</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
              <h2 className="text-xl font-medium mb-4">Network Information</h2>
              <div className="space-y-2 text-sm">
                <p>
                  <span className="text-zinc-500">Online Status:</span>{" "}
                  <span className={navigator.onLine ? "text-green-500" : "text-red-500"}>
                    {navigator.onLine ? "Online" : "Offline"}
                  </span>
                </p>
                <p>
                  <span className="text-zinc-500">User Agent:</span> {navigator.userAgent}
                </p>
                <Button
                  onClick={() => {
                    addLog("Testing connection to Vimeo API...")
                    fetch("https://api.vimeo.com/", {
                      method: "HEAD",
                    })
                      .then((response) => {
                        addLog(`Vimeo API connection test: ${response.status} ${response.statusText}`)
                      })
                      .catch((error) => {
                        addLog(`Vimeo API connection error: ${error.message}`)
                      })
                  }}
                  variant="outline"
                  size="sm"
                  className="mt-2"
                >
                  Test Vimeo API Connection
                </Button>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-xl font-medium mb-4">Diagnostic Logs</h2>
            <div className="bg-black/50 border border-zinc-800 rounded-lg p-4 h-[500px] overflow-y-auto font-mono text-xs">
              {logs.length === 0 ? (
                <p className="text-zinc-500">No logs yet. Start a test to see logs.</p>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="mb-1">
                    {log.includes("ERROR") ? (
                      <p className="text-red-500">{log}</p>
                    ) : log.includes("progress") ? (
                      <p className="text-blue-400">{log}</p>
                    ) : log.includes("success") ? (
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
        </div>
      </main>
    </div>
  )
}
