"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ExternalLink, Database, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react"

export default function FirestoreIndexHelper() {
  const [indexInfo, setIndexInfo] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const getIndexInfo = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/create-basic-indexes", { method: "POST" })
      const data = await response.json()
      setIndexInfo(data)
    } catch (error) {
      console.error("Error getting index info:", error)
    } finally {
      setLoading(false)
    }
  }

  const testConnection = async () => {
    try {
      const response = await fetch("/api/uploads")
      if (response.ok) {
        window.location.reload()
      }
    } catch (error) {
      console.error("Connection test failed:", error)
    }
  }

  return (
    <Card className="bg-zinc-900/60 border-zinc-800/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5 text-blue-500" />
          Database Setup Required
        </CardTitle>
        <CardDescription>The uploads feature requires basic Firestore indexes to function properly.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Database indexes are missing. This is normal for new projects and can be fixed quickly.
          </AlertDescription>
        </Alert>

        {!indexInfo ? (
          <Button onClick={getIndexInfo} disabled={loading} className="w-full">
            {loading ? "Loading..." : "Get Setup Instructions"}
          </Button>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium text-white">Quick Fix:</h4>
              <p className="text-sm text-zinc-400">
                The easiest way is to let Firestore create indexes automatically by running a few queries.
              </p>
              <Button onClick={testConnection} className="w-full bg-green-600 hover:bg-green-700">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again (Auto-create indexes)
              </Button>
            </div>

            <div className="border-t border-zinc-700 pt-4">
              <h4 className="font-medium text-white mb-2">Manual Setup (if needed):</h4>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start border-zinc-700"
                  onClick={() => window.open(indexInfo.consoleUrl, "_blank")}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Firebase Console
                </Button>
              </div>

              <div className="mt-4 space-y-2">
                <p className="text-sm text-zinc-400">Required fields to index:</p>
                <div className="grid grid-cols-2 gap-2">
                  {indexInfo.fields?.map((field: any, index: number) => (
                    <div key={index} className="text-xs bg-zinc-800 p-2 rounded">
                      <div className="font-medium text-white">{field.field}</div>
                      <div className="text-zinc-400">{field.type}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Most of the time, simply trying the upload again will automatically create the needed indexes.
              </AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
