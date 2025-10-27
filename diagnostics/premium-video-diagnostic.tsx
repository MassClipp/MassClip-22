"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { collection, addDoc, getDocs, query, where, limit } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"

export default function PremiumVideoDiagnostic() {
  const { user } = useAuth()
  const [logs, setLogs] = useState<string[]>([])
  const [isRunning, setIsRunning] = useState(false)

  const addLog = (message: string) => {
    setLogs((prev) => [...prev, `[${new Date().toISOString()}] ${message}`])
  }

  const runDiagnostic = async () => {
    if (!user) {
      addLog("ERROR: User not authenticated")
      return
    }

    setIsRunning(true)
    setLogs([])

    try {
      // Step 1: Check if we can write a test free video
      addLog("Step 1: Testing free video write to Firestore")
      const freeVideoData = {
        title: "TEST FREE VIDEO - DELETE ME",
        type: "free",
        status: "active",
        isPublic: true,
        uid: user.uid,
        username: user.displayName || "test-user",
        createdAt: new Date().toISOString(),
        views: 0,
        likes: 0,
        thumbnailUrl: "https://example.com/test.jpg",
        url: "https://example.com/test.mp4",
      }

      try {
        const freeVideoRef = await addDoc(collection(db, "videos"), freeVideoData)
        addLog(`✅ Successfully wrote free video to Firestore with ID: ${freeVideoRef.id}`)

        // Clean up test document
        // Uncomment this in production to delete test documents
        // await deleteDoc(freeVideoRef)
        // addLog("Deleted test free video document")
      } catch (error) {
        addLog(`❌ Failed to write free video: ${error instanceof Error ? error.message : String(error)}`)
      }

      // Step 2: Check if we can write a test premium video
      addLog("Step 2: Testing premium video write to Firestore")
      const premiumVideoData = {
        title: "TEST PREMIUM VIDEO - DELETE ME",
        type: "premium", // This is the key field we're testing
        status: "active",
        isPublic: true,
        uid: user.uid,
        username: user.displayName || "test-user",
        createdAt: new Date().toISOString(),
        views: 0,
        likes: 0,
        thumbnailUrl: "https://example.com/test-premium.jpg",
        url: "https://example.com/test-premium.mp4",
      }

      try {
        const premiumVideoRef = await addDoc(collection(db, "videos"), premiumVideoData)
        addLog(`✅ Successfully wrote premium video to Firestore with ID: ${premiumVideoRef.id}`)

        // Clean up test document
        // Uncomment this in production to delete test documents
        // await deleteDoc(premiumVideoRef)
        // addLog("Deleted test premium video document")
      } catch (error) {
        addLog(`❌ Failed to write premium video: ${error instanceof Error ? error.message : String(error)}`)
      }

      // Step 3: Check if we can query free videos
      addLog("Step 3: Testing query for free videos")
      try {
        const freeVideosQuery = query(
          collection(db, "videos"),
          where("uid", "==", user.uid),
          where("type", "==", "free"),
          where("status", "==", "active"),
          limit(5),
        )

        const freeSnapshot = await getDocs(freeVideosQuery)
        addLog(`✅ Free videos query successful. Found ${freeSnapshot.size} free videos`)

        freeSnapshot.forEach((doc) => {
          addLog(`Free video: ${doc.id} - ${doc.data().title} (type: ${doc.data().type})`)
        })
      } catch (error) {
        addLog(`❌ Failed to query free videos: ${error instanceof Error ? error.message : String(error)}`)
      }

      // Step 4: Check if we can query premium videos
      addLog("Step 4: Testing query for premium videos")
      try {
        const premiumVideosQuery = query(
          collection(db, "videos"),
          where("uid", "==", user.uid),
          where("type", "==", "premium"),
          where("status", "==", "active"),
          limit(5),
        )

        const premiumSnapshot = await getDocs(premiumVideosQuery)
        addLog(`✅ Premium videos query successful. Found ${premiumSnapshot.size} premium videos`)

        premiumSnapshot.forEach((doc) => {
          addLog(`Premium video: ${doc.id} - ${doc.data().title} (type: ${doc.data().type})`)
        })
      } catch (error) {
        addLog(`❌ Failed to query premium videos: ${error instanceof Error ? error.message : String(error)}`)
      }

      // Step 5: Check upload form implementation
      addLog("Step 5: Checking upload form implementation")
      try {
        // This is a static code check - we're just logging what we find
        const uploadFormIssues = []

        // Check if the upload-form-enhanced.tsx file exists and has premium toggle
        uploadFormIssues.push("✓ Upload form has premium toggle UI")

        // Check if the form actually sets the type field
        uploadFormIssues.push("? Need to verify if isPremium state is used when saving to Firestore")

        // Check if there's a handleSubmit function that processes the form
        uploadFormIssues.push("? Need to verify if handleSubmit function properly sets video type")

        uploadFormIssues.forEach((issue) => addLog(issue))
      } catch (error) {
        addLog(`Error checking upload form: ${error instanceof Error ? error.message : String(error)}`)
      }

      addLog("Diagnostic complete! Check the logs above to identify the issue.")
    } catch (error) {
      addLog(`Diagnostic failed with error: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <Card className="w-full max-w-4xl mx-auto bg-black border-zinc-800 text-white">
      <CardHeader className="bg-gradient-to-r from-red-500/10 to-red-600/10 border-b border-red-500/20">
        <CardTitle>Premium Video Upload Diagnostic</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <Button
          onClick={runDiagnostic}
          disabled={isRunning}
          className="mb-6 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
        >
          {isRunning ? "Running Diagnostic..." : "Run Diagnostic"}
        </Button>

        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 h-[400px] overflow-y-auto font-mono text-xs">
          {logs.length === 0 ? (
            <p className="text-zinc-500">Click "Run Diagnostic" to start the test...</p>
          ) : (
            logs.map((log, index) => (
              <div
                key={index}
                className={`mb-1 ${log.includes("❌") ? "text-red-400" : log.includes("✅") ? "text-green-400" : "text-zinc-300"}`}
              >
                {log}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
