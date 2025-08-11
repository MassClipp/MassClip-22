"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, XCircle, Loader } from "lucide-react"

type Status = "idle" | "loading" | "success" | "fail"

interface DiagnosticResult {
  check: string
  status: Status
  details?: string
}

interface DiagnosticCategory {
  title: string
  results: DiagnosticResult[]
}

const initialResults: DiagnosticCategory[] = [
  {
    title: "Environment Variables",
    results: [
      { check: "Stripe Webhook Secret Loaded", status: "idle" },
      { check: "Firebase Project ID Loaded", status: "idle" },
      { check: "Firebase Client Email Loaded", status: "idle" },
      { check: "Firebase Private Key Loaded", status: "idle" },
    ],
  },
  {
    title: "Firebase Admin",
    results: [
      { check: "DB Instance Available", status: "idle" },
      { check: "Firestore Write Test", status: "idle" },
    ],
  },
  {
    title: "Webhook Processor",
    results: [{ check: "Module Importable", status: "idle" }],
  },
]

const StatusIcon = ({ status }: { status: Status }) => {
  switch (status) {
    case "success":
      return <CheckCircle className="h-5 w-5 text-green-500" />
    case "fail":
      return <XCircle className="h-5 w-5 text-red-500" />
    case "loading":
      return <Loader className="h-5 w-5 animate-spin" />
    default:
      return null
  }
}

export default function WebhookDiagnosticsPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<DiagnosticCategory[]>(initialResults)

  const runDiagnostics = async () => {
    setIsLoading(true)
    setResults(initialResults)

    try {
      const response = await fetch("/api/admin/debug-webhook")
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to run diagnostics")
      }

      const newResults: DiagnosticCategory[] = [
        {
          title: "Environment Variables",
          results: [
            { check: "Stripe Webhook Secret Loaded", status: data.stripeWebhookSecret ? "success" : "fail" },
            { check: "Firebase Project ID Loaded", status: data.firebaseProjectId ? "success" : "fail" },
            { check: "Firebase Client Email Loaded", status: data.firebaseClientEmail ? "success" : "fail" },
            { check: "Firebase Private Key Loaded", status: data.firebasePrivateKey ? "success" : "fail" },
          ],
        },
        {
          title: "Firebase Admin",
          results: [
            { check: "DB Instance Available", status: data.dbInstanceAvailable ? "success" : "fail" },
            { check: "Firestore Write Test", status: data.firestoreWriteTest ? "success" : "fail" },
          ],
        },
        {
          title: "Webhook Processor",
          results: [{ check: "Module Importable", status: data.moduleImportable ? "success" : "fail" }],
        },
      ]
      setResults(newResults)
    } catch (error) {
      console.error("Diagnostic error:", error)
      // You could set a general error state here
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gray-900 text-white p-4">
      <Card className="w-full max-w-2xl bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-center text-2xl">Webhook Diagnostics</CardTitle>
          <p className="text-center text-gray-400">
            This tool checks the server environment to ensure webhooks can be processed correctly.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <Button
            onClick={runDiagnostics}
            disabled={isLoading}
            className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold py-3 text-lg"
          >
            {isLoading ? <Loader className="animate-spin mr-2" /> : null}
            {isLoading ? "Running..." : "Run Webhook Diagnostics"}
          </Button>

          <div className="space-y-4 rounded-lg bg-gray-900 p-4">
            <h3 className="text-lg font-semibold">Diagnostic Results</h3>
            {results.map((category) => (
              <div key={category.title}>
                <h4 className="font-bold text-gray-300 mb-2">{category.title}</h4>
                <ul className="space-y-2">
                  {category.results.map((result) => (
                    <li key={result.check} className="flex items-center justify-between rounded-md bg-gray-800 p-3">
                      <span className="text-gray-300">{result.check}</span>
                      <StatusIcon status={result.status} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <Card className="bg-gray-800 border-gray-700 p-4">
            <CardHeader>
              <CardTitle className="text-lg">Next Steps</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400">
                If any checks fail, please review your environment variables on Vercel. If the module import fails, it
                indicates a syntax error in the `webhook-processor.ts` file. Ensure the old webhook files have been
                deleted.
              </p>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  )
}
