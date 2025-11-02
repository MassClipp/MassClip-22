"use client"

import { useState } from "react"
import { testDownloadMethods } from "@/scripts/direct-download-test"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, XCircle } from "lucide-react"

export default function DownloadMethodTester() {
  const [isRunning, setIsRunning] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [testUrl, setTestUrl] = useState("")
  const [filename, setFilename] = useState("test-video.mp4")

  const runTests = async () => {
    setIsRunning(true)
    try {
      const testResults = await testDownloadMethods(
        testUrl ||
          "https://player.vimeo.com/progressive_redirect/download/123456789/container/123456789.mp4?loc=external&signature=abc123",
        filename,
      )
      setResults(testResults)
    } catch (error) {
      console.error("Error running tests:", error)
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <Card className="bg-black border-gray-800">
      <CardHeader>
        <CardTitle className="text-white">Download Method Tester</CardTitle>
        <CardDescription className="text-gray-400">
          Test different download methods to see which works best in your environment
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <label htmlFor="testUrl" className="block text-sm font-medium text-gray-300 mb-1">
              Test URL
            </label>
            <input
              id="testUrl"
              type="text"
              className="w-full p-2 bg-gray-900 border border-gray-700 rounded-md text-white"
              placeholder="https://player.vimeo.com/progressive_redirect/download/..."
              value={testUrl}
              onChange={(e) => setTestUrl(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter a Vimeo download URL to test (leave blank to use a default test URL)
            </p>
          </div>

          <div>
            <label htmlFor="filename" className="block text-sm font-medium text-gray-300 mb-1">
              Filename
            </label>
            <input
              id="filename"
              type="text"
              className="w-full p-2 bg-gray-900 border border-gray-700 rounded-md text-white"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
            />
          </div>

          <Button onClick={runTests} disabled={isRunning} className="w-full bg-red-600 hover:bg-red-700 text-white">
            {isRunning ? "Testing Download Methods..." : "Test Download Methods"}
          </Button>

          {results.length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-medium text-white mb-3">Test Results</h3>
              <div className="space-y-2">
                {results.map((result, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-md ${
                      result.success
                        ? "bg-green-900/20 border border-green-900/50"
                        : "bg-red-900/20 border border-red-900/50"
                    }`}
                  >
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        {result.success ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                      <div className="ml-3">
                        <h4 className="text-sm font-medium text-white">{result.method}</h4>
                        {result.error && <p className="mt-1 text-xs text-red-400">Error: {result.error}</p>}
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
        Each method will attempt to download the file. Check your downloads folder after each test.
      </CardFooter>
    </Card>
  )
}
