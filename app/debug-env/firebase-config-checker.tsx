"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, XCircle, AlertTriangle, Flame } from "lucide-react"
import { useEffect, useState } from "react"

interface FirebaseStatus {
  isConfigured: boolean
  config: any
  errors: string[]
  warnings: string[]
}

export function FirebaseConfigChecker() {
  const [firebaseStatus, setFirebaseStatus] = useState<FirebaseStatus>({
    isConfigured: false,
    config: null,
    errors: [],
    warnings: [],
  })

  useEffect(() => {
    checkFirebaseConfiguration()
  }, [])

  const checkFirebaseConfiguration = async () => {
    const errors: string[] = []
    const warnings: string[] = []

    // Check required Firebase environment variables
    const requiredVars = [
      "NEXT_PUBLIC_FIREBASE_API_KEY",
      "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
      "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
      "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
      "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
      "NEXT_PUBLIC_FIREBASE_APP_ID",
    ]

    const missingVars = requiredVars.filter((varName) => !process.env[varName])

    if (missingVars.length > 0) {
      errors.push(`Missing required environment variables: ${missingVars.join(", ")}`)
    }

    // Try to initialize Firebase
    let config = null
    let isConfigured = false

    try {
      // Dynamic import to avoid SSR issues
      const { getFirebaseClientConfig } = await import("@/lib/env-config")
      config = getFirebaseClientConfig()

      // Check if we're using demo configuration
      if (config.apiKey === "demo-api-key") {
        warnings.push("Using demo Firebase configuration - authentication will not work")
      } else {
        isConfigured = true
      }

      // Validate configuration values
      if (config.projectId && !config.projectId.match(/^[a-z0-9-]+$/)) {
        errors.push("Invalid Firebase project ID format")
      }

      if (config.authDomain && !config.authDomain.includes(".firebaseapp.com")) {
        warnings.push("Auth domain does not follow standard Firebase format")
      }
    } catch (error) {
      errors.push(`Firebase initialization error: ${error instanceof Error ? error.message : "Unknown error"}`)
    }

    setFirebaseStatus({
      isConfigured,
      config,
      errors,
      warnings,
    })
  }

  const configFields = [
    { key: "apiKey", label: "API Key", sensitive: true },
    { key: "authDomain", label: "Auth Domain", sensitive: false },
    { key: "projectId", label: "Project ID", sensitive: false },
    { key: "storageBucket", label: "Storage Bucket", sensitive: false },
    { key: "messagingSenderId", label: "Messaging Sender ID", sensitive: false },
    { key: "appId", label: "App ID", sensitive: true },
    { key: "measurementId", label: "Measurement ID", sensitive: false },
  ]

  const getStatusIcon = (value: any) => {
    return value ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />
  }

  const getStatusBadge = (value: any) => {
    if (!value) {
      return <Badge variant="destructive">Missing</Badge>
    }
    if (value === "demo-api-key" || value.includes("demo-project")) {
      return <Badge variant="outline">Demo Mode</Badge>
    }
    return (
      <Badge variant="default" className="bg-green-100 text-green-800">
        Configured
      </Badge>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flame className="h-5 w-5" />
          Firebase Configuration Status
        </CardTitle>
        <CardDescription>Firebase client-side configuration validation and status</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Status */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            {firebaseStatus.isConfigured ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
            <span className="font-semibold">Firebase Status</span>
          </div>
          <Badge
            variant={firebaseStatus.isConfigured ? "default" : "destructive"}
            className={firebaseStatus.isConfigured ? "bg-green-100 text-green-800" : ""}
          >
            {firebaseStatus.isConfigured ? "Configured" : "Not Configured"}
          </Badge>
        </div>

        {/* Configuration Fields */}
        {firebaseStatus.config && (
          <div className="space-y-3">
            <h4 className="font-semibold">Configuration Fields</h4>
            {configFields.map(({ key, label, sensitive }) => {
              const value = firebaseStatus.config[key]
              return (
                <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(value)}
                    <span className="text-sm font-medium">{label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(value)}
                    {value && (
                      <code className="text-xs text-gray-600 max-w-xs truncate">
                        {sensitive && !value.includes("demo") ? "[CONFIGURED]" : value}
                      </code>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Errors */}
        {firebaseStatus.errors.length > 0 && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Configuration Errors</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1">
                {firebaseStatus.errors.map((error, index) => (
                  <li key={index} className="text-sm">
                    {error}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Warnings */}
        {firebaseStatus.warnings.length > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Configuration Warnings</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1">
                {firebaseStatus.warnings.map((warning, index) => (
                  <li key={index} className="text-sm">
                    {warning}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Firebase Setup Instructions */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-semibold text-blue-800 mb-2">Firebase Setup Steps</h4>
          <ol className="list-decimal list-inside space-y-1 text-sm text-blue-700">
            <li>
              Go to{" "}
              <a
                href="https://console.firebase.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Firebase Console
              </a>
            </li>
            <li>Create a new project or select an existing one</li>
            <li>Go to Project Settings → General → Your apps</li>
            <li>Add a web app or select an existing one</li>
            <li>Copy the configuration values to your environment variables</li>
            <li>Enable Authentication in the Firebase console</li>
            <li>Configure your authentication providers (Google, Email/Password, etc.)</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  )
}
