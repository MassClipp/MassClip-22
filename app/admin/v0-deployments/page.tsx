"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/hooks/use-toast"

export default function V0DeploymentsPage() {
  const [deployments, setDeployments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // In a real implementation, you would fetch the intercepted deployments
    // from your database or storage
    setLoading(false)
    setDeployments([
      {
        id: "1",
        timestamp: new Date().toISOString(),
        projectName: "Example v0.dev Project",
        files: ["app/example.tsx", "components/ui/button.tsx"],
        status: "pending",
      },
    ])
  }, [])

  const handleCreatePR = async (deploymentId) => {
    try {
      // In a real implementation, you would call your API to create a PR
      // from the intercepted deployment
      toast({
        title: "Creating PR",
        description: "Creating pull request for deployment " + deploymentId,
      })

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      toast({
        title: "PR Created",
        description: "Pull request created successfully",
      })

      // Update the deployment status
      setDeployments(deployments.map((d) => (d.id === deploymentId ? { ...d, status: "pr_created" } : d)))
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create PR: " + error.message,
        variant: "destructive",
      })
    }
  }

  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>v0.dev Deployments</CardTitle>
          <CardDescription>
            Manage deployments from v0.dev and create pull requests to the preview branch
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Loading deployments...</div>
          ) : deployments.length === 0 ? (
            <div className="text-center py-4">No deployments intercepted yet</div>
          ) : (
            <div className="space-y-4">
              {deployments.map((deployment) => (
                <Card key={deployment.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{deployment.projectName}</CardTitle>
                    <CardDescription>Deployed on {new Date(deployment.timestamp).toLocaleString()}</CardDescription>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <div className="text-sm">
                      <strong>Files:</strong> {deployment.files.join(", ")}
                    </div>
                    <div className="text-sm mt-2">
                      <strong>Status:</strong> {deployment.status === "pending" ? "Pending" : "PR Created"}
                    </div>
                  </CardContent>
                  <CardFooter>
                    {deployment.status === "pending" ? (
                      <Button onClick={() => handleCreatePR(deployment.id)}>Create PR to Preview</Button>
                    ) : (
                      <Button variant="outline" disabled>
                        PR Created
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
