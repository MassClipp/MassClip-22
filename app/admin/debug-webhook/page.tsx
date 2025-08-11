"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface DiagnosticResults {
  envVars: {
    stripeWebhookSecret: boolean
    firebaseProjectId: boolean
    firebaseClientEmail: boolean
    firebasePrivateKey: boolean
  }
  firebase: {
    dbInstanceAvailable: boolean
    firestoreWriteSuccess: boolean
    errorMessage: string
  }
  webhookProcessor: {
    canImport: boolean
    errorMessage: string
  }
}

const ResultBadge = ({ status }: { status: boolean }) => (
  <span
    className={`px-2 py-1 text-xs font-bold rounded-full ${
      status ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
    }`}
  >
    {status ? "OK" : "FAIL"}
  </span>
)

export default function WebhookDiagnosticsPage() {
  const [results, setResults] = useState<DiagnosticResults | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runDiagnostics = async () => {
    setIsLoading(true)
    setError(null)
    setResults(null)
    try {
      const response = await fetch("/api/admin/debug-webhook")
      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`)
      }
      const data = await response.json()
      setResults(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white p-4">
      <Card className="w-full max-w-2xl bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle>Webhook Diagnostics</CardTitle>
          <p className="text-gray-400">
            This tool checks the server environment to ensure webhooks can be processed correctly.
          </p>
        </CardHeader>
        <CardContent>
          <Button onClick={runDiagnostics} disabled={isLoading} className="w-full bg-pink-600 hover:bg-pink-700">
            {isLoading ? "Running..." : "Run Webhook Diagnostics"}
          </Button>

          {error && (
            <Alert variant="destructive" className="mt-4 bg-red-900/50 border-red-500 text-white">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {results && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2">Diagnostic Results</h3>
              <div className="space-y-3 p-4 rounded-lg bg-gray-900">
                <div>
                  <h4 className="font-semibold text-gray-300 mb-2">Environment Variables</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex justify-between items-center">
                      <span>Stripe Webhook Secret Loaded</span>
                      <ResultBadge status={results.envVars.stripeWebhookSecret} />
                    </li>
                    <li className="flex justify-between items-center">
                      <span>Firebase Project ID Loaded</span>
                      <ResultBadge status={results.envVars.firebaseProjectId} />
                    </li>
                    <li className="flex justify-between items-center">
                      <span>Firebase Client Email Loaded</span>
                      <ResultBadge status={results.envVars.firebaseClientEmail} />
                    </li>
                    <li className="flex justify-between items-center">
                      <span>Firebase Private Key Loaded</span>
                      <ResultBadge status={results.envVars.firebasePrivateKey} />
                    </li>
                  </ul>
                </div>
                <Separator className="bg-gray-700" />
                <div>
                  <h4 className="font-semibold text-gray-300 mb-2">Firebase Admin</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex justify-between items-center">
                      <span>DB Instance Available</span>
                      <ResultBadge status={results.firebase.dbInstanceAvailable} />
                    </li>
                    <li className="flex justify-between items-center">
                      <span>Firestore Write Test</span>
                      <ResultBadge status={results.firebase.firestoreWriteSuccess} />
                    </li>
                  </ul>
                  {results.firebase.errorMessage && (
                    <p className="text-xs text-red-400 mt-2">Error: {results.firebase.errorMessage}</p>
                  )}
                </div>
                <Separator className="bg-gray-700" />
                <div>
                  <h4 className="font-semibold text-gray-300 mb-2">Webhook Processor</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex justify-between items-center">
                      <span>Module Importable</span>
                      <ResultBadge status={results.webhookProcessor.canImport} />
                    </li>
                  </ul>
                  {results.webhookProcessor.errorMessage && (
                    <p className="text-xs text-red-400 mt-2">Error: {results.webhookProcessor.errorMessage}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
