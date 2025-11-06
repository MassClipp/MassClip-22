"use client"

import { useEffect, useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { isFirebaseConfigured } from "@/lib/firebase"
import { AlertCircle, CheckCircle, RefreshCw } from "lucide-react"

export function FirebaseStatus() {
  const [status, setStatus] = useState<"checking" | "configured" | "not-configured">("checking")
  const [configDetails, setConfigDetails] = useState<Record<string, boolean>>({})

  const checkFirebaseStatus = () => {
    setStatus("checking")

    // Check if Firebase is configured
    const isConfigured = isFirebaseConfigured()

    // Get environment variable status
    const details = {
      apiKey: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: !!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: !!process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: !!process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: !!process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    }

    setConfigDetails(details)
    setStatus(isConfigured ? "configured" : "not-configured")
  }

  useEffect(() => {
    checkFirebaseStatus()
  }, [])

  if (status === "checking") {
    return (
      <Alert className="bg-blue-900/20 border-blue-900/30 text-blue-400">
        <RefreshCw className="h-4 w-4 animate-spin" />
        <AlertTitle>Checking Firebase Configuration</AlertTitle>
        <AlertDescription>Verifying Firebase setup...</AlertDescription>
      </Alert>
    )
  }

  if (status === "configured") {
    return (
      <Alert className="bg-green-900/20 border-green-900/30 text-green-400">
        <CheckCircle className="h-4 w-4" />
        <AlertTitle>Firebase Configured</AlertTitle>
        <AlertDescription>Firebase is properly configured and ready to use.</AlertDescription>
      </Alert>
    )
  }

  return (
    <Alert variant="destructive" className="bg-red-900/20 border-red-900/30 text-red-400">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Firebase Not Configured</AlertTitle>
      <AlertDescription className="space-y-2">
        <p>Firebase is not properly configured. Please check your environment variables.</p>

        <div className="mt-2 text-sm">
          <h4 className="font-semibold mb-1">Environment Variables Status:</h4>
          <ul className="space-y-1">
            {Object.entries(configDetails).map(([key, exists]) => (
              <li key={key} className="flex items-center">
                {exists ? (
                  <CheckCircle className="h-3 w-3 mr-2 text-green-500" />
                ) : (
                  <AlertCircle className="h-3 w-3 mr-2 text-red-500" />
                )}
                {key}: {exists ? "Present" : "Missing"}
              </li>
            ))}
          </ul>
        </div>

        <Button size="sm" variant="outline" className="mt-2" onClick={checkFirebaseStatus}>
          <RefreshCw className="h-3 w-3 mr-2" />
          Recheck Configuration
        </Button>
      </AlertDescription>
    </Alert>
  )
}
