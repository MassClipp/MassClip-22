"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, AlertTriangle, Loader2, ExternalLink } from "lucide-react"

export default function FixIndexes() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleAutoFix = async () => {
    try {
      setLoading(true)
      setError(null)
      setResult(null)

      const response = await fetch("/api/auto-create-indexes", {
        method: "POST",
      })

      const data = await response.json()
      setResult(data)

      if (!data.success) {
        setError(data.message || "Failed to create index")
      }
    } catch (err) {
      setError("An error occurred while creating the index")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const openFirebaseConsole = () => {
    window.open("https://console.firebase.google.com/project/massclip-96dc4/firestore/indexes", "_blank")
  }

  return (
    <div className="container max-w-2xl py-10">
      <Card>
        <CardHeader>
          <CardTitle>Fix Firestore Indexes</CardTitle>
          <CardDescription>Automatically create the required indexes for your product box content</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Missing Index</AlertTitle>
            <AlertDescription>
              Your app needs a Firestore index to query product box content. Click the button below to create it
              automatically.
            </AlertDescription>
          </Alert>

          {result && result.success && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Success!</AlertTitle>
              <AlertDescription className="text-green-700">{result.message}</AlertDescription>
            </Alert>
          )}

          {result && !result.success && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Manual Setup Required</AlertTitle>
              <AlertDescription>
                Automatic creation failed. Please follow these steps to create the index manually:
              </AlertDescription>
            </Alert>
          )}

          {result && result.manualSteps && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-lg">Manual Steps</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="list-decimal pl-5 space-y-2 text-sm">
                  {result.manualSteps.map((step: string, index: number) => (
                    <li key={index}>{step}</li>
                  ))}
                </ol>
              </CardContent>
              <CardFooter>
                <Button onClick={openFirebaseConsole} className="w-full">
                  Open Firebase Console <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => window.history.back()}>
            Back
          </Button>
          <Button onClick={handleAutoFix} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Index...
              </>
            ) : (
              "Auto-Fix Index"
            )}
          </Button>
        </CardFooter>
      </Card>

      {result && result.success && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>What's Next?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Great! The index has been created. You can now go back to your product box and try accessing the content
              again. It should work now!
            </p>
            <div className="mt-4">
              <Button onClick={() => (window.location.href = "/dashboard/purchases")}>Go to My Purchases</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
