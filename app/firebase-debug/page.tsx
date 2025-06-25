"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FirebaseStatus } from "@/components/firebase-status"
import { Button } from "@/components/ui/button"
import { initializeFirebase, isFirebaseConfigured } from "@/lib/firebase"
import { RefreshCw, AlertCircle, CheckCircle } from "lucide-react"

export default function FirebaseDebugPage() {
  const [envVars, setEnvVars] = useState<Record<string, string | undefined>>({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Get all NEXT_PUBLIC_FIREBASE environment variables
    const vars: Record<string, string | undefined> = {}
    Object.keys(process.env).forEach((key) => {
      if (key.startsWith("NEXT_PUBLIC_FIREBASE")) {
        vars[key] = process.env[key]
          ? `${process.env[key]?.substring(0, 5)}...${process.env[key]?.substring(process.env[key]?.length - 5 || 0)}`
          : undefined
      }
    })

    setEnvVars(vars)
    setIsLoading(false)
  }, [])

  const handleReinitialize = () => {
    setIsLoading(true)
    try {
      const firebase = initializeFirebase()
      console.log("Firebase reinitialized:", {
        app: !!firebase.app,
        auth: !!firebase.auth,
        db: !!firebase.db,
        storage: !!firebase.storage,
      })
    } catch (error) {
      console.error("Failed to reinitialize Firebase:", error)
    }
    setIsLoading(false)
  }

  return (
    <div className="container mx-auto py-10 space-y-6">
      <h1 className="text-3xl font-bold">Firebase Configuration Debug</h1>

      <FirebaseStatus />

      <Card>
        <CardHeader>
          <CardTitle>Environment Variables</CardTitle>
          <CardDescription>These are the Firebase environment variables available to your application.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center p-4">
              <RefreshCw className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-2">
              {Object.keys(envVars).length > 0 ? (
                Object.entries(envVars).map(([key, value]) => (
                  <div key={key} className="flex items-start">
                    <div className="mr-2 mt-0.5">
                      {value ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                    <div>
                      <p className="font-mono text-sm">{key}</p>
                      <p className="text-sm text-gray-500">{value ? value : "Not set"}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-red-500">No Firebase environment variables found!</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Firebase Status</CardTitle>
          <CardDescription>Current status of Firebase initialization</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <span>Firebase Configured:</span>
              {isFirebaseConfigured() ? (
                <span className="text-green-500 flex items-center">
                  <CheckCircle className="h-4 w-4 mr-1" /> Yes
                </span>
              ) : (
                <span className="text-red-500 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" /> No
                </span>
              )}
            </div>

            <Button onClick={handleReinitialize} disabled={isLoading}>
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Reinitializing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reinitialize Firebase
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="text-sm text-gray-500">
        <p>
          If Firebase is not configured properly, please check your environment variables and make sure they are
          correctly set in your Vercel project settings.
        </p>
      </div>
    </div>
  )
}
