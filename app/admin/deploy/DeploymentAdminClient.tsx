"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Upload, CheckCircle, XCircle } from "lucide-react"

export default function DeploymentAdminClient() {
  const { user } = useAuth()
  const [code, setCode] = useState("")
  const [isDeploying, setIsDeploying] = useState(false)
  const [deployResult, setDeployResult] = useState<{
    success: boolean
    message: string
  } | null>(null)

  const handleDeploy = async () => {
    if (!code.trim()) {
      setDeployResult({
        success: false,
        message: "Please enter code to deploy",
      })
      return
    }

    setIsDeploying(true)
    setDeployResult(null)

    try {
      const response = await fetch("/api/deploy-ai-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code: code.trim() }),
      })

      const result = await response.json()

      if (response.ok) {
        setDeployResult({
          success: true,
          message: result.message || "Code deployed successfully!",
        })
        setCode("") // Clear the textarea on success
      } else {
        setDeployResult({
          success: false,
          message: result.error || "Deployment failed",
        })
      }
    } catch (error) {
      setDeployResult({
        success: false,
        message: "Network error occurred during deployment",
      })
    } finally {
      setIsDeploying(false)
    }
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You must be logged in to access this page.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            AI Code Deployment
          </CardTitle>
          <CardDescription>
            Deploy AI-generated code to the application. Use with caution in production.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="code">Code to Deploy</Label>
            <Textarea
              id="code"
              placeholder="Paste your AI-generated code here..."
              value={code}
              onChange={(e) => setCode(e.target.value)}
              rows={12}
              className="font-mono text-sm"
            />
          </div>

          {deployResult && (
            <Alert className={deployResult.success ? "border-green-500" : "border-red-500"}>
              <div className="flex items-center gap-2">
                {deployResult.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription className={deployResult.success ? "text-green-700" : "text-red-700"}>
                  {deployResult.message}
                </AlertDescription>
              </div>
            </Alert>
          )}

          <Button onClick={handleDeploy} disabled={isDeploying || !code.trim()} className="w-full">
            {isDeploying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deploying...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Deploy Code
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
