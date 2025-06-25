"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, RefreshCw } from "lucide-react"

export default function FirebaseClientTestPage() {
  const [serverDiagnostic, setServerDiagnostic] = useState<any>(null)
  const [clientTest, setClientTest] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const runDiagnostics = async () => {
    setLoading(true)

    try {
      // Get server-side diagnostic
      const serverResponse = await fetch("/api/debug/firebase-detailed")
      const serverData = await serverResponse.json()
      setServerDiagnostic(serverData)

      // Run client-side test
      const clientTestResult = await runClientSideTest()
      setClientTest(clientTestResult)
    } catch (error) {
      console.error("Diagnostic error:", error)
    } finally {
      setLoading(false)
    }
  }

  const runClientSideTest = async () => {
    const results: any = {
      environmentVariables: {},
      firebaseInitialization: null,
      authTest: null,
    }

    // Check client-side environment variables
    const clientEnvVars = [
      "NEXT_PUBLIC_FIREBASE_API_KEY",
      "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
      "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
      "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
      "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
      "NEXT_PUBLIC_FIREBASE_APP_ID",
      "NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID",
    ]

    clientEnvVars.forEach((varName) => {
      const value = process.env[varName]
      results.environmentVariables[varName] = {
        present: !!value,
        length: value?.length || 0,
        preview: value ? `${value.substring(0, 10)}...` : "undefined",
      }
    })

    // Test Firebase initialization
    try {
      const { initializeApp, getApps } = await import("firebase/app")
      const { getAuth } = await import("firebase/auth")

      const config = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
        measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
      }

      console.log("Testing Firebase config:", config)

      // Try to initialize
      let app
      if (getApps().length === 0) {
        app = initializeApp(config)
      } else {
        app = getApps()[0]
      }

      const auth = getAuth(app)

      results.firebaseInitialization = {
        success: true,
        appName: app.name,
        hasAuth: !!auth,
        config: {
          apiKey: config.apiKey ? `${config.apiKey.substring(0, 10)}...` : "missing",
          projectId: config.projectId || "missing",
          authDomain: config.authDomain || "missing",
        },
      }

      // Test auth functionality
      try {
        // This should fail gracefully if the API key is invalid
        await auth.currentUser
        results.authTest = { success: true, message: "Auth service accessible" }
      } catch (authError: any) {
        results.authTest = {
          success: false,
          error: authError.message,
          code: authError.code,
        }
      }
    } catch (initError: any) {
      results.firebaseInitialization = {
        success: false,
        error: initError.message,
        code: initError.code,
      }
    }

    return results
  }

  useEffect(() => {
    runDiagnostics()
  }, [])

  const getStatusIcon = (success: boolean) => {
    return success ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />
  }

  const getStatusBadge = (success: boolean, text?: string) => {
    return (
      <Badge variant={success ? "default" : "destructive"} className={success ? "bg-green-100 text-green-800" : ""}>
        {text || (success ? "Success" : "Failed")}
      </Badge>
    )
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Firebase Client-Side Test</h1>
        <Button onClick={runDiagnostics} disabled={loading}>
          {loading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
          {loading ? "Running..." : "Run Diagnostics"}
        </Button>
      </div>

      <div className="space-y-6">
        {/* Server Diagnostic Results */}
        {serverDiagnostic && (
          <Card>
            <CardHeader>
              <CardTitle>Server-Side Analysis</CardTitle>
              <CardDescription>Environment variables and configuration validation from the server</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {serverDiagnostic.serverInitTest?.apiKeyFormat && (
                <div className="space-y-2">
                  <h4 className="font-semibold">API Key Analysis</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center justify-between">
                      <span>Starts with AIzaSy:</span>
                      {getStatusBadge(serverDiagnostic.serverInitTest.apiKeyFormat.startsWithAIzaSy)}
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Correct Length:</span>
                      {getStatusBadge(serverDiagnostic.serverInitTest.apiKeyFormat.correctLength)}
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Valid Characters:</span>
                      {getStatusBadge(serverDiagnostic.serverInitTest.apiKeyFormat.hasOnlyValidChars)}
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Length:</span>
                      <code>{serverDiagnostic.serverInitTest.apiKeyFormat.actualLength}</code>
                    </div>
                  </div>
                </div>
              )}

              {serverDiagnostic.recommendations && (
                <div className="space-y-2">
                  <h4 className="font-semibold">Recommendations</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {serverDiagnostic.recommendations.map((rec: string, index: number) => (
                      <li key={index}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Client Test Results */}
        {clientTest && (
          <Card>
            <CardHeader>
              <CardTitle>Client-Side Test Results</CardTitle>
              <CardDescription>Firebase initialization and authentication test from the browser</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Firebase Initialization */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Firebase Initialization</h4>
                  {getStatusBadge(clientTest.firebaseInitialization?.success)}
                </div>

                {clientTest.firebaseInitialization?.success ? (
                  <div className="text-sm space-y-1">
                    <p>App Name: {clientTest.firebaseInitialization.appName}</p>
                    <p>Has Auth: {clientTest.firebaseInitialization.hasAuth ? "Yes" : "No"}</p>
                  </div>
                ) : (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertTitle>Initialization Failed</AlertTitle>
                    <AlertDescription>
                      {clientTest.firebaseInitialization?.error}
                      {clientTest.firebaseInitialization?.code && (
                        <>
                          <br />
                          <code>Code: {clientTest.firebaseInitialization.code}</code>
                        </>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Auth Test */}
              {clientTest.authTest && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">Authentication Test</h4>
                    {getStatusBadge(clientTest.authTest.success)}
                  </div>

                  {!clientTest.authTest.success && (
                    <Alert variant="destructive">
                      <XCircle className="h-4 w-4" />
                      <AlertTitle>Auth Test Failed</AlertTitle>
                      <AlertDescription>
                        {clientTest.authTest.error}
                        {clientTest.authTest.code && (
                          <>
                            <br />
                            <code>Code: {clientTest.authTest.code}</code>
                          </>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
