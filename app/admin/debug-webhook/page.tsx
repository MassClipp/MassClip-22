"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, XCircle, AlertTriangle, Loader2 } from "lucide-react"

type DiagnosticResult = {
  envVars: {
    stripeWebhookSecret: boolean
    firebaseServiceAccountKey: boolean
  }
  firebase: {
    sdkInitialized: boolean
    firestoreWriteSuccess: boolean
    errorMessage: string
  }
  webhookProcessor: {
    canImport: boolean
    errorMessage: string
  }
}

const ResultRow = ({ label, success, message }: { label: string; success: boolean; message?: string }) => (
  <div className="flex items-center justify-between p-2 rounded-md bg-gray-800">
    <div className="flex items-center">
      {success ? (
        <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
      ) : (
        <XCircle className="h-5 w-5 text-red-400 mr-2" />
      )}
      <span className="text-sm font-medium text-gray-300">{label}</span>
    </div>
    <span className={`text-sm font-bold ${success ? "text-green-400" : "text-red-400"}`}>
      {success ? "OK" : "FAIL"}
    </span>
    {message && <p className="text-xs text-gray-500 mt-1 col-span-2">{message}</p>}
  </div>
)

export default function WebhookDiagnosticsPage() {
  const [results, setResults] = useState<DiagnosticResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleRunDiagnostics = async () => {
    setIsLoading(true)
    setResults(null)
    try {
      const response = await fetch("/api/admin/debug-webhook")
      const data = await response.json()
      setResults(data)
    } catch (error) {
      console.error("Failed to run diagnostics:", error)
      // You can set an error state here to show in the UI
    }
    setIsLoading(false)
  }

  const firebaseKeyFailed = results && !results.envVars.firebaseServiceAccountKey

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle>Webhook Diagnostics</CardTitle>
          <CardDescription>
            This tool checks the server environment to ensure webhooks can be processed correctly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleRunDiagnostics} disabled={isLoading} className="w-full bg-pink-600 hover:bg-pink-700">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Run Webhook Diagnostics
          </Button>

          {results && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2">Diagnostic Results</h3>
              <div className="space-y-2">
                <ResultRow label="Stripe Webhook Secret Loaded" success={results.envVars.stripeWebhookSecret} />
                <ResultRow
                  label="Firebase Service Account Key Loaded"
                  success={results.envVars.firebaseServiceAccountKey}
                />
                <Separator className="bg-gray-700 my-2" />
                <ResultRow label="Firebase Admin SDK Initialized" success={results.firebase.sdkInitialized} />
                <ResultRow label="Firestore Write Test" success={results.firebase.firestoreWriteSuccess} />
                <Separator className="bg-gray-700 my-2" />
                <ResultRow label="Webhook Processor Module Import" success={results.webhookProcessor.canImport} />
              </div>

              {firebaseKeyFailed && (
                <Alert variant="destructive" className="mt-6 bg-red-900/20 border-red-500 text-red-300">
                  <AlertTriangle className="h-4 w-4 !text-red-400" />
                  <AlertTitle>Critical Action Required</AlertTitle>
                  <AlertDescription>
                    The `FIREBASE_SERVICE_ACCOUNT_KEY` environment variable is missing. This is the primary cause of
                    webhook failures. Please ensure this variable is correctly set in your Vercel project settings for
                    all environments (Production, Preview, and Development).
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
