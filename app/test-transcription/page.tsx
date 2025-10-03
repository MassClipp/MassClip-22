"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { auth, db } from "@/lib/firebase/firebase"
import { collection, query, where, getDocs, limit } from "firebase/firestore"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Upload {
  id: string
  title: string
  videoUrl: string
  mimeType: string
  createdAt: any
}

export default function TestTranscriptionPage() {
  const [uploads, setUploads] = useState<Upload[]>([])
  const [selectedUploadId, setSelectedUploadId] = useState<string>("")
  const [logs, setLogs] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isFetchingUploads, setIsFetchingUploads] = useState(false)

  const addLog = (message: string) => {
    setLogs((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const fetchUploads = async () => {
    setIsFetchingUploads(true)
    addLog("📥 Fetching real uploads from database...")

    try {
      const user = auth.currentUser
      if (!user) {
        addLog("❌ No user logged in")
        setIsFetchingUploads(false)
        return
      }

      const uploadsRef = collection(db, "uploads")
      const q = query(uploadsRef, where("userId", "==", user.uid), limit(20))

      const snapshot = await getDocs(q)
      const uploadsList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Upload[]

      uploadsList.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0
        const bTime = b.createdAt?.toMillis?.() || 0
        return bTime - aTime
      })

      setUploads(uploadsList)
      addLog(`✅ Found ${uploadsList.length} uploads`)

      if (uploadsList.length > 0) {
        setSelectedUploadId(uploadsList[0].id)
      }
    } catch (error) {
      addLog(`❌ Error fetching uploads: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setIsFetchingUploads(false)
    }
  }

  useEffect(() => {
    fetchUploads()
  }, [])

  const testTranscription = async () => {
    setLogs([])
    setIsLoading(true)
    addLog("🚀 Starting transcription test...")

    try {
      const user = auth.currentUser
      if (!user) {
        addLog("❌ No user logged in. Please log in first.")
        setIsLoading(false)
        return
      }

      const selectedUpload = uploads.find((u) => u.id === selectedUploadId)
      if (!selectedUpload) {
        addLog("❌ No upload selected")
        setIsLoading(false)
        return
      }

      addLog(`📹 Testing with: ${selectedUpload.title}`)
      addLog(`🆔 Upload ID: ${selectedUpload.id}`)

      const token = await user.getIdToken()
      addLog("✅ Got auth token")

      addLog("📡 Testing /api/uploads/auto-transcribe endpoint...")

      const response = await fetch("/api/uploads/auto-transcribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          videoUrl: selectedUpload.videoUrl,
          uploadId: selectedUpload.id,
          mimeType: selectedUpload.mimeType || "video/quicktime",
        }),
      })

      addLog(`📊 Response status: ${response.status}`)

      const data = await response.json()
      addLog(`📦 Response data: ${JSON.stringify(data, null, 2)}`)

      if (response.ok) {
        addLog("✅ Transcription request successful!")
      } else {
        addLog(`❌ Transcription request failed: ${data.error || "Unknown error"}`)
      }
    } catch (error) {
      addLog(`❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setIsLoading(false)
    }
  }

  const testGroqDirectly = async () => {
    setLogs([])
    setIsLoading(true)
    addLog("🚀 Testing Groq API directly...")

    try {
      const response = await fetch("/api/test-groq", {
        method: "POST",
      })

      addLog(`📊 Response status: ${response.status}`)

      const data = await response.json()
      addLog(`📦 Response: ${JSON.stringify(data, null, 2)}`)
    } catch (error) {
      addLog(`❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Transcription Test Page</h1>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Test Groq API Connection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Test if the Groq API key is accessible and working</p>
            <Button onClick={testGroqDirectly} disabled={isLoading}>
              Test Groq API
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test Transcription Endpoint</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Test the auto-transcribe endpoint with a real uploaded video
            </p>

            <div className="space-y-2">
              <label className="text-sm font-medium">Select Upload</label>
              <div className="flex gap-2">
                <Select value={selectedUploadId} onValueChange={setSelectedUploadId} disabled={isFetchingUploads}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select an upload" />
                  </SelectTrigger>
                  <SelectContent>
                    {uploads.map((upload) => (
                      <SelectItem key={upload.id} value={upload.id}>
                        {upload.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={fetchUploads} disabled={isFetchingUploads} variant="outline">
                  {isFetchingUploads ? "Loading..." : "Refresh"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">{uploads.length} uploads available</p>
            </div>

            <Button onClick={testTranscription} disabled={isLoading || !selectedUploadId}>
              {isLoading ? "Testing..." : "Test Transcription"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm h-96 overflow-y-auto">
              {logs.length === 0 ? (
                <p className="text-gray-500">No logs yet. Click a test button above.</p>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className="mb-1">
                    {log}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
