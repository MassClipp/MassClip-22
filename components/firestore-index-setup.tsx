"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ExternalLink, Database, AlertCircle } from "lucide-react"

interface IndexInfo {
  collection: string
  fields: Array<{ field: string; order: string }>
  description: string
  createUrl: string
}

interface IndexSetupResponse {
  message: string
  status: string
  indexes: IndexInfo[]
  instructions: {
    automatic: string
    manual: string
    cli: string
  }
  estimatedTime: string
  firebaseConsole: string
}

export function FirestoreIndexSetup() {
  const [indexInfo, setIndexInfo] = useState<IndexSetupResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchIndexInfo()
  }, [])

  const fetchIndexInfo = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/setup-firestore-indexes")
      const data = await response.json()

      if (response.ok) {
        setIndexInfo(data)
      } else {
        setError(data.error || "Failed to fetch index information")
      }
    } catch (err) {
      setError("Network error while fetching index information")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Loading Firestore Index Setup...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!indexInfo) {
    return null
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Firestore Index Setup Required
          </CardTitle>
          <CardDescription>{indexInfo.message}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Estimated Time:</strong> {indexInfo.estimatedTime}
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Required Indexes</h3>
            {indexInfo.indexes.map((index, i) => (
              <Card key={i} className="border-l-4 border-l-blue-500">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{index.collection}</CardTitle>
                  <CardDescription>{index.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-sm">
                    <strong>Fields:</strong> {index.fields.map((field) => `${field.field} (${field.order})`).join(", ")}
                  </div>
                  <Button asChild size="sm" className="w-full">
                    <a href={index.createUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Create This Index
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Setup Instructions</h3>

            <div className="space-y-3">
              <div className="p-3 bg-green-50 border border-green-200 rounded">
                <h4 className="font-medium text-green-800">Option 1: Automatic (Recommended)</h4>
                <p className="text-sm text-green-700 mt-1">{indexInfo.instructions.automatic}</p>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                <h4 className="font-medium text-blue-800">Option 2: Manual</h4>
                <p className="text-sm text-blue-700 mt-1">{indexInfo.instructions.manual}</p>
              </div>

              <div className="p-3 bg-purple-50 border border-purple-200 rounded">
                <h4 className="font-medium text-purple-800">Option 3: Firebase CLI</h4>
                <p className="text-sm text-purple-700 mt-1">{indexInfo.instructions.cli}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button asChild variant="outline">
              <a href={indexInfo.firebaseConsole} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Firebase Console
              </a>
            </Button>
            <Button onClick={fetchIndexInfo} variant="outline">
              Refresh Status
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
