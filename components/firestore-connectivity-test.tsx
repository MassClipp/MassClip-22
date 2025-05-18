"use client"

import { useState, useEffect } from "react"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, CheckCircle, XCircle } from "lucide-react"

export function FirestoreConnectivityTest() {
  const [status, setStatus] = useState<"idle" | "testing" | "success" | "error">("idle")
  const [message, setMessage] = useState("")
  const [details, setDetails] = useState("")

  const testConnection = async () => {
    setStatus("testing")
    setMessage("Testing Firestore connection...")
    setDetails("")

    try {
      console.log("Testing Firestore connection")

      // Create a timestamp to make each test unique
      const timestamp = new Date().toISOString()

      // Try to write to a test collection
      const testRef = db.collection("connectivityTests").doc(timestamp)
      await testRef.set({
        timestamp,
        success: true,
      })

      console.log("Write test successful")

      // Try to read it back
      const doc = await testRef.get()

      if (doc.exists) {
        console.log("Read test successful")
        setStatus("success")
        setMessage("Firestore connection is working!")
        setDetails(`Successfully wrote and read test document at ${timestamp}`)

        // Clean up the test document
        await testRef.delete()
      } else {
        throw new Error("Document was written but couldn't be read back")
      }
    } catch (error) {
      console.error("Firestore connection test failed:", error)
      setStatus("error")
      setMessage("Firestore connection failed")
      setDetails(error instanceof Error ? error.message : String(error))
    }
  }

  // Run the test automatically on mount
  useEffect(() => {
    testConnection()
  }, [])

  return (
    <Card className="border-gray-800 bg-black/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center">
          {status === "testing" && <Loader2 className="h-5 w-5 mr-2 animate-spin text-blue-500" />}
          {status === "success" && <CheckCircle className="h-5 w-5 mr-2 text-green-500" />}
          {status === "error" && <XCircle className="h-5 w-5 mr-2 text-red-500" />}
          Firestore Connectivity Test
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <p
            className={`${
              status === "success" ? "text-green-500" : status === "error" ? "text-red-500" : "text-gray-300"
            }`}
          >
            {message}
          </p>

          {details && <p className="text-sm text-gray-400 break-words">{details}</p>}

          <Button
            onClick={testConnection}
            disabled={status === "testing"}
            variant={status === "error" ? "destructive" : "default"}
            size="sm"
          >
            {status === "testing" ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              "Test Again"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
