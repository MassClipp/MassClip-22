"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface EnvResult {
  name: string
  exists: boolean
  isEmpty: boolean
  isWhitespace: boolean
  length: number
  type: string
  preview: string
  hasValue: boolean
}

interface DiagnosticResponse {
  success: boolean
  summary: {
    total: number
    valid: number
    missing: number
    empty: number
    whitespace: number
    allValid: boolean
  }
  details: EnvResult[]
  emptyVariables: string[]
  missingVariables: string[]
  whitespaceVariables: string[]
  validVariables: string[]
  error?: string
}

export default function FirebaseDiagnosticPage() {
  const [results, setResults] = useState<DiagnosticResponse | null>(null)
  const [loading, setLoading] = useState(false)

  const runDiagnostic = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/debug/firebase-env")
      const data = await response.json()
      setResults(data)
    } catch (error) {
      console.error("Failed to run diagnostic:", error)
      setResults({
        success: false,
        error: "Failed to fetch diagnostic data",
        summary: { total: 0, valid: 0, missing: 0, empty: 0, whitespace: 0, allValid: false },
        details: [],
        emptyVariables: [],
        missingVariables: [],
        whitespaceVariables: [],
        validVariables: [],
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    runDiagnostic()
  }, [])

  const getStatusBadge = (result: EnvResult) => {
    if (!result.exists) return <Badge variant="destructive">Missing</Badge>
    if (result.isEmpty) return <Badge variant="destructive">Empty</Badge>
    if (result.isWhitespace) return <Badge variant="secondary">Whitespace</Badge>
    if (result.hasValue) return <Badge variant="default">Valid</Badge>
    return <Badge variant="outline">Unknown</Badge>
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Firebase Environment Diagnostic</h1>
        <Button onClick={runDiagnostic} disabled={loading}>
          {loading ? "Running..." : "Refresh Diagnostic"}
        </Button>
      </div>

      {results && (
        <>
          {/* Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Summary
                {results.summary.allValid ? (
                  <Badge variant="default">All Valid</Badge>
                ) : (
                  <Badge variant="destructive">Issues Found</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{results.summary.valid}</div>
                  <div className="text-sm text-gray-600">Valid</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{results.summary.missing}</div>
                  <div className="text-sm text-gray-600">Missing</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{results.summary.empty}</div>
                  <div className="text-sm text-gray-600">Empty</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{results.summary.whitespace}</div>
                  <div className="text-sm text-gray-600">Whitespace</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{results.summary.total}</div>
                  <div className="text-sm text-gray-600">Total</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Results */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Variable Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {results.details.map((result) => (
                  <div key={result.name} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-mono text-sm">{result.name}</div>
                      <div className="text-xs text-gray-500">
                        Length: {result.length} | Type: {result.type}
                      </div>
                      {result.hasValue && <div className="text-xs text-gray-400 font-mono">{result.preview}</div>}
                    </div>
                    <div className="flex items-center gap-2">{getStatusBadge(result)}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Issues Found */}
          {!results.summary.allValid && (
            <Card>
              <CardHeader>
                <CardTitle className="text-red-600">Issues Found</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {results.missingVariables.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-red-600">Missing Variables:</h4>
                    <ul className="list-disc list-inside text-sm">
                      {results.missingVariables.map((name) => (
                        <li key={name} className="font-mono">
                          {name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {results.emptyVariables.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-red-600">Empty Variables:</h4>
                    <ul className="list-disc list-inside text-sm">
                      {results.emptyVariables.map((name) => (
                        <li key={name} className="font-mono">
                          {name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {results.whitespaceVariables.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-yellow-600">Whitespace-Only Variables:</h4>
                    <ul className="list-disc list-inside text-sm">
                      {results.whitespaceVariables.map((name) => (
                        <li key={name} className="font-mono">
                          {name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Success Message */}
          {results.summary.allValid && (
            <Card>
              <CardHeader>
                <CardTitle className="text-green-600">✅ All Variables Valid!</CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  All Firebase environment variables are properly set. The issue with demo mode is likely in the
                  validation logic or Firebase initialization code, not your environment variables.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
