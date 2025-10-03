"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { auth } from "@/lib/firebase/firebase"

export default function TestTranscriptionPage() {
  const [videoUrl, setVideoUrl] = useState("")
  const [logs, setLogs] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const addLog = (message: string) => {
    setLogs((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

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
          videoUrl:
            videoUrl ||
            "https://pub-93cabcf58da344dea3d33ba1e4be2ef2.r2.dev/creators/motivationcave/1759448614293-Damii_.Daddy's_Money.mov",
          uploadId: "test_" + Date.now(),
          mimeType: "video/quicktime",
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
            <p className="text-sm text-muted-foreground">Test the auto-transcribe endpoint with a video URL</p>
            <Input
              placeholder="Video URL (optional - will use test URL if empty)"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
            />
            <Button onClick={testTranscription} disabled={isLoading}>
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
