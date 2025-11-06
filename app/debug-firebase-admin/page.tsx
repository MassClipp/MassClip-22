"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from "lucide-react"

interface ConfigCheck {
  environmentVariables: {
    FIREBASE_PROJECT_ID: { exists: boolean; value: string | null }
    FIREBASE_CLIENT_EMAIL: { exists: boolean; value: string | null }
    FIREBASE_PRIVATE_KEY: { exists: boolean; length: number; startsWithBegin: boolean }
  }
  firebaseAdmin: {
    initialized: boolean
    hasAuth: boolean
    hasDb: boolean
    error: string | null
  }
  recommendations: string[]
}

export default function FirebaseAdminDebugPage() {
  const [config, setConfig] = useState<ConfigCheck | null>(null)
  const [loading, setLoading] = useState(false)

  const checkConfig = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/debug/firebase-admin-config")
      const data = await response.json()
      setConfig(data)
    } catch (error) {
      console.error("Failed to check config:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkConfig()
  }, [])

  const getStatusIcon = (exists: boolean) => {
    return exists ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Firebase Admin Configuration Debug</h1>
        <Button onClick={checkConfig} disabled={loading}>
          {loading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
          {loading ? "Checking..." : "Refresh"}
        </Button>
      </div>

      {config && (
        <>
          {/* Environment Variables */}
          <Card>
            <CardHeader>
              <CardTitle>Environment Variables</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon(config.environmentVariables.FIREBASE_PROJECT_ID.exists)}
                  <span className="font-mono">FIREBASE_PROJECT_ID</span>
                </div>
                <div className="text-sm text-gray-500">
                  {config.environmentVariables.FIREBASE_PROJECT_ID.value || "Not set"}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon(config.environmentVariables.FIREBASE_CLIENT_EMAIL.exists)}
                  <span className="font-mono">FIREBASE_CLIENT_EMAIL</span>
                </div>
                <div className="text-sm text-gray-500">
                  {config.environmentVariables.FIREBASE_CLIENT_EMAIL.value || "Not set"}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon(config.environmentVariables.FIREBASE_PRIVATE_KEY.exists)}
                  <span className="font-mono">FIREBASE_PRIVATE_KEY</span>
                </div>
                <div className="text-sm text-gray-500 space-x-2">
                  <span>Length: {config.environmentVariables.FIREBASE_PRIVATE_KEY.length}</span>
                  {config.environmentVariables.FIREBASE_PRIVATE_KEY.startsWithBegin ? (
                    <Badge variant="default">Valid Format</Badge>
                  ) : (
                    <Badge variant="destructive">Invalid Format</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Firebase Admin Status */}
          <Card>
            <CardHeader>
              <CardTitle>Firebase Admin Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Initialized</span>
                {config.firebaseAdmin.initialized ? (
                  <Badge variant="default">Yes</Badge>
                ) : (
                  <Badge variant="destructive">No</Badge>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span>Auth Service</span>
                {config.firebaseAdmin.hasAuth ? (
                  <Badge variant="default">Available</Badge>
                ) : (
                  <Badge variant="destructive">Unavailable</Badge>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span>Firestore Service</span>
                {config.firebaseAdmin.hasDb ? (
                  <Badge variant="default">Available</Badge>
                ) : (
                  <Badge variant="destructive">Unavailable</Badge>
                )}
              </div>

              {config.firebaseAdmin.error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{config.firebaseAdmin.error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Recommendations */}
          {config.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-red-600">Issues Found</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {config.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
                      <span className="text-sm">{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Success Message */}
          {config.recommendations.length === 0 && config.firebaseAdmin.initialized && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                ✅ Firebase Admin is properly configured! The purchases API should work now.
              </AlertDescription>
            </Alert>
          )}
        </>
      )}
    </div>
  )
}
