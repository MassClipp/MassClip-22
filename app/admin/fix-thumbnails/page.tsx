"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import { Loader2, ImageIcon } from "lucide-react"

export default function FixThumbnailsPage() {
  const [isFixing, setIsFixing] = useState(false)
  const [result, setResult] = useState<any>(null)
  const { user } = useFirebaseAuth()
  const { toast } = useToast()

  const handleFixThumbnails = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to fix thumbnails",
        variant: "destructive",
      })
      return
    }

    setIsFixing(true)
    setResult(null)

    try {
      const token = await user.getIdToken()
      const response = await fetch("/api/fix-missing-thumbnails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to fix thumbnails")
      }

      const data = await response.json()
      setResult(data)

      toast({
        title: "Thumbnails Fixed",
        description: `Successfully fixed ${data.fixed} uploads`,
      })
    } catch (error) {
      console.error("Error fixing thumbnails:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fix thumbnails",
        variant: "destructive",
      })
    } finally {
      setIsFixing(false)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Fix Missing Thumbnails
          </CardTitle>
          <CardDescription>
            This tool will add placeholder thumbnails to video uploads that don't have thumbnailUrl set.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleFixThumbnails} disabled={isFixing || !user}>
            {isFixing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Fixing Thumbnails...
              </>
            ) : (
              "Fix Missing Thumbnails"
            )}
          </Button>

          {result && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
              <h3 className="font-medium text-green-800">Results:</h3>
              <p className="text-green-700">{result.message}</p>
              {result.fixed > 0 && (
                <p className="text-sm text-green-600">
                  Fixed {result.fixed} out of {result.total} uploads
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
