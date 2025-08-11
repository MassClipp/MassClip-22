"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"

type DiagnosticResult = {
  envVars: {
    stripeWebhookSecret: boolean
    firebaseServiceAccountKey: boolean
  }
  firebase: {
    sdkInitialized: boolean
    firestoreWriteSuccess: boolean
    errorMessage?: string
  }
  webhookProcessor: {
    canImport: boolean
    errorMessage?: string
  }
}

export default function DebugWebhookPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<DiagnosticResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const runDiagnostics = async () => {
    setIsLoading(true)
    setError(null)
    setResults(null)
    try {
      const response = await fetch("/api/admin/debug-webhook")
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Failed to run diagnostics")
      }
      setResults(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const StatusIndicator = ({ success }: { success: boolean }) => (
    <span className={`font-bold ${success ? "text-green-500" : "text-red-500"}`}>{success ? "OK" : "FAIL"}</span>
  )

  return (
    <div className="container mx-auto p-4 md:p-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Webhook Diagnostics</CardTitle>
          <CardDescription>
            This tool checks the server environment to ensure webhooks can be processed correctly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4">
            <Button onClick={runDiagnostics} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running...
                </>
              ) : (
                "Run Webhook Diagnostics"
              )}
            </Button>

            {error && (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {results && (
              <div className="space-y-4 pt-4">
                <h3 className="text-lg font-semibold">Diagnostic Results</h3>
                <div className="p-4 border rounded-md bg-gray-50 dark:bg-gray-900">
                  <ul className="space-y-2">
                    <li>
                      Stripe Webhook Secret Loaded: <StatusIndicator success={results.envVars.stripeWebhookSecret} />
                    </li>
                    <li>
                      Firebase Service Account Key Loaded:{" "}
                      <StatusIndicator success={results.envVars.firebaseServiceAccountKey} />
                    </li>
                    <hr />
                    <li>
                      Firebase Admin SDK Initialized: <StatusIndicator success={results.firebase.sdkInitialized} />
                    </li>
                    <li>
                      Firestore Write Test: <StatusIndicator success={results.firebase.firestoreWriteSuccess} />
                    </li>
                    {results.firebase.errorMessage && (
                      <li className="text-red-500 text-sm">Error: {results.firebase.errorMessage}</li>
                    )}
                    <hr />
                    <li>
                      Webhook Processor Module Importable:{" "}
                      <StatusIndicator success={results.webhookProcessor.canImport} />
                    </li>
                    {results.webhookProcessor.errorMessage && (
                      <li className="text-red-500 text-sm">Error: {results.webhookProcessor.errorMessage}</li>
                    )}
                  </ul>
                </div>
                <Alert>
                  <AlertTitle>Next Steps</AlertTitle>
                  <AlertDescription>
                    If any checks fail, please review your environment variables on Vercel. If the module import fails,
                    it indicates a syntax error in the `webhook-processor.ts` file. Ensure the old webhook files have
                    been deleted.
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
