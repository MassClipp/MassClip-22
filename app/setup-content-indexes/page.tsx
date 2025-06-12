"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangle, ExternalLink } from "lucide-react"

export default function SetupContentIndexes() {
  const [indexUrl, setIndexUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [instructions, setInstructions] = useState<string[]>([])

  useEffect(() => {
    async function fetchIndexInfo() {
      try {
        setLoading(true)
        const response = await fetch("/api/setup-content-indexes")
        const data = await response.json()

        if (data.success) {
          setIndexUrl(data.indexUrl)
          setInstructions(data.instructions || [])
        } else {
          setError(data.error || "Failed to get index information")
        }
      } catch (err) {
        setError("An error occurred while fetching index information")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchIndexInfo()
  }, [])

  return (
    <div className="container max-w-3xl py-10">
      <Card>
        <CardHeader>
          <CardTitle>Setup Firestore Indexes</CardTitle>
          <CardDescription>Create the required indexes for product box content queries</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center p-6">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              <span className="ml-2">Loading index information...</span>
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : (
            <>
              <Alert className="mb-6">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Missing Index</AlertTitle>
                <AlertDescription>
                  Your Firestore database is missing an index required for product box content queries.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Instructions:</h3>
                <ol className="list-decimal pl-5 space-y-2">
                  {instructions.map((instruction, index) => (
                    <li key={index}>{instruction}</li>
                  ))}
                </ol>
              </div>
            </>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => window.history.back()}>
            Back
          </Button>
          {indexUrl && (
            <Button onClick={() => window.open(indexUrl, "_blank")}>
              Create Index <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          )}
        </CardFooter>
      </Card>

      {!loading && !error && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>After Creating the Index</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              After creating the index, it may take a few minutes for Firebase to build it. Once the index is built, you
              can try accessing your product box content again. The error should be resolved.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
