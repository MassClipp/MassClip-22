"use client"

import { useState } from "react"
import { runDownloadDiagnostics } from "@/scripts/download-diagnostic"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, CheckCircle, Info, AlertTriangle } from "lucide-react"

export default function DownloadDiagnosticRunner() {
  const [isRunning, setIsRunning] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [testUrl, setTestUrl] = useState("")

  const runDiagnostics = async () => {
    setIsRunning(true)
    try {
      const diagnosticResults = await runDownloadDiagnostics(testUrl || undefined)
      setResults(diagnosticResults)
    } catch (error) {
      console.error("Error running diagnostics:", error)
      setResults({
        overallStatus: "error",
        primaryIssue: error instanceof Error ? error.message : "Unknown error running diagnostics",
        results: [],
      })
    } finally {
      setIsRunning(false)
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-500" />
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-amber-500" />
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      default:
        return <Info className="h-5 w-5 text-blue-500" />
    }
  }

  return (
    <div className="container mx-auto py-8">
      <Card className="bg-black border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Download Diagnostic Tool</CardTitle>
          <CardDescription className="text-gray-400">
            Diagnose issues with video downloads in your MassClip application
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label htmlFor="testUrl" className="block text-sm font-medium text-gray-300 mb-1">
                Test URL (Optional)
              </label>
              <input
                id="testUrl"
                type="text"
                className="w-full p-2 bg-gray-900 border border-gray-700 rounded-md text-white"
                placeholder="https://player.vimeo.com/progressive_redirect/download/..."
                value={testUrl}
                onChange={(e) => setTestUrl(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">Leave blank to use a default test URL</p>
            </div>

            <Button
              onClick={runDiagnostics}
              disabled={isRunning}
              className="w-full bg-red-600 hover:bg-red-700 text-white"
            >
              {isRunning ? "Running Diagnostics..." : "Run Download Diagnostics"}
            </Button>

            {results && (
              <div className="mt-6 space-y-6">
                <div
                  className={`p-4 rounded-md ${
                    results.overallStatus === "error"
                      ? "bg-red-900/30 border border-red-800"
                      : results.overallStatus === "warning"
                        ? "bg-amber-900/30 border border-amber-800"
                        : "bg-green-900/30 border border-green-800"
                  }`}
                >
                  <div className="flex items-start">
                    <div className="flex-shrink-0">{getSeverityIcon(results.overallStatus)}</div>
                    <div className="ml-3">
                      <h3
                        className={`text-sm font-medium ${
                          results.overallStatus === "error"
                            ? "text-red-400"
                            : results.overallStatus === "warning"
                              ? "text-amber-400"
                              : "text-green-400"
                        }`}
                      >
                        {results.overallStatus === "error"
                          ? "Critical Issues Detected"
                          : results.overallStatus === "warning"
                            ? "Potential Issues Detected"
                            : "All Tests Passed"}
                      </h3>
                      {results.primaryIssue && (
                        <div className="mt-2 text-sm text-gray-300">
                          <p>
                            <strong>Primary Issue:</strong> {results.primaryIssue}
                          </p>
                          {results.recommendedFix && (
                            <p className="mt-1">
                              <strong>Recommended Fix:</strong> {results.recommendedFix}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <h3 className="text-lg font-medium text-white">Detailed Results</h3>
                <div className="space-y-3">
                  {results.results.map((result: any, index: number) => (
                    <div
                      key={index}
                      className={`p-3 rounded-md ${
                        result.severity === "error"
                          ? "bg-red-900/20 border border-red-900/50"
                          : result.severity === "warning"
                            ? "bg-amber-900/20 border border-amber-900/50"
                            : result.severity === "success"
                              ? "bg-green-900/20 border border-green-900/50"
                              : "bg-blue-900/20 border border-blue-900/50"
                      }`}
                    >
                      <div className="flex items-start">
                        <div className="flex-shrink-0 mt-0.5">{getSeverityIcon(result.severity)}</div>
                        <div className="ml-3">
                          <h4 className="text-sm font-medium text-white">{result.test}</h4>
                          <p className="mt-1 text-sm text-gray-300">{result.details}</p>
                          {result.fix && (
                            <p className="mt-1 text-sm text-gray-400">
                              <strong>Fix:</strong> {result.fix}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="text-xs text-gray-500">
          This tool checks for common issues that might prevent downloads from working properly.
        </CardFooter>
      </Card>
    </div>
  )
}
