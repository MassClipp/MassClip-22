"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, User, AlertCircle, CheckCircle, RefreshCw } from "lucide-react"

interface DiagnosticResult {
  userId: string
  userProfiles: any
  users: any
  recommendations: string[]
}

export default function UserProfileDiagnostic() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<DiagnosticResult | null>(null)
  const { toast } = useToast()

  const runDiagnostic = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/debug/user-profile")

      if (!response.ok) {
        throw new Error("Failed to run diagnostic")
      }

      const data = await response.json()
      setResult(data)

      toast({
        title: "Diagnostic Complete",
        description: "User profile diagnostic completed successfully",
      })
    } catch (error) {
      console.error("Diagnostic error:", error)
      toast({
        title: "Diagnostic Failed",
        description: error instanceof Error ? error.message : "Failed to run diagnostic",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (exists: boolean | undefined) => {
    if (exists === true) return <CheckCircle className="h-4 w-4 text-green-500" />
    if (exists === false) return <AlertCircle className="h-4 w-4 text-red-500" />
    return <AlertCircle className="h-4 w-4 text-yellow-500" />
  }

  const getStatusBadge = (exists: boolean | undefined) => {
    if (exists === true)
      return (
        <Badge variant="default" className="bg-green-600">
          Found
        </Badge>
      )
    if (exists === false) return <Badge variant="destructive">Missing</Badge>
    return <Badge variant="secondary">Error</Badge>
  }

  return (
    <Card className="bg-zinc-900/60 border-zinc-800/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          User Profile Diagnostic
        </CardTitle>
        <CardDescription>Debug user profile and username lookup issues</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={runDiagnostic} disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Running Diagnostic...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Run Diagnostic
            </>
          )}
        </Button>

        {result && (
          <div className="space-y-4">
            <div className="text-sm text-zinc-400">
              <strong>User ID:</strong> {result.userId}
            </div>

            {/* UserProfiles Collection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">UserProfiles Collection</span>
                {getStatusBadge(result.userProfiles?.exists)}
              </div>
              {result.userProfiles?.exists && (
                <div className="text-xs text-zinc-400 space-y-1">
                  <div>
                    <strong>Username:</strong> {result.userProfiles.username || "Not set"}
                  </div>
                  <div>
                    <strong>Display Name:</strong> {result.userProfiles.displayName || "Not set"}
                  </div>
                  <div>
                    <strong>Email:</strong> {result.userProfiles.email || "Not set"}
                  </div>
                </div>
              )}
            </div>

            {/* Users Collection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Users Collection</span>
                {getStatusBadge(result.users?.exists)}
              </div>
              {result.users?.exists && (
                <div className="text-xs text-zinc-400 space-y-1">
                  <div>
                    <strong>Username:</strong> {result.users.username || "Not set"}
                  </div>
                  <div>
                    <strong>Display Name:</strong> {result.users.displayName || "Not set"}
                  </div>
                  <div>
                    <strong>Email:</strong> {result.users.email || "Not set"}
                  </div>
                </div>
              )}
            </div>

            {/* Recommendations */}
            {result.recommendations.length > 0 && (
              <div className="space-y-2">
                <span className="text-sm font-medium text-yellow-400">Recommendations:</span>
                <ul className="text-xs text-zinc-400 space-y-1">
                  {result.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <AlertCircle className="h-3 w-3 text-yellow-500 mt-0.5 flex-shrink-0" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
