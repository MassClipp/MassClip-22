"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"

export default function PreviewDeployPage() {
  const [filePath, setFilePath] = useState("")
  const [commitMessage, setCommitMessage] = useState("")
  const [prTitle, setPrTitle] = useState("")
  const [prDescription, setPrDescription] = useState("")
  const [fileContent, setFileContent] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/create-pr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          file_path: filePath,
          file_content: fileContent,
          commit_message: commitMessage,
          pr_title: prTitle,
          pr_description: prDescription,
        }),
      })

      const data = await response.json()
      setResult(data)

      if (response.ok) {
        toast({
          title: "Deployment successful",
          description: `Changes committed to preview branch and PR created/updated`,
        })
      } else {
        toast({
          title: "Deployment failed",
          description: data.error || "An unknown error occurred",
          variant: "destructive",
        })
      }
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : "An unknown error occurred" })
      toast({
        title: "Deployment failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Deploy to Preview Branch</CardTitle>
          <CardDescription>Deploy code to the preview branch and create a pull request to main</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="filePath">File Path</Label>
              <Input
                id="filePath"
                placeholder="e.g., app/api/test/route.ts"
                value={filePath}
                onChange={(e) => setFilePath(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="commitMessage">Commit Message</Label>
              <Input
                id="commitMessage"
                placeholder="e.g., Add new API endpoint"
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="prTitle">Pull Request Title (optional)</Label>
              <Input
                id="prTitle"
                placeholder="e.g., Add new features from v0.dev"
                value={prTitle}
                onChange={(e) => setPrTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="prDescription">Pull Request Description (optional)</Label>
              <Textarea
                id="prDescription"
                placeholder="Describe the changes in this pull request"
                value={prDescription}
                onChange={(e) => setPrDescription(e.target.value)}
                className="h-24"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fileContent">File Content</Label>
              <Textarea
                id="fileContent"
                placeholder="Paste your code here"
                value={fileContent}
                onChange={(e) => setFileContent(e.target.value)}
                className="font-mono h-64"
                required
              />
            </div>

            {result && (
              <div className="p-4 border rounded-md bg-gray-50">
                <pre className="whitespace-pre-wrap text-sm">{JSON.stringify(result, null, 2)}</pre>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Deploying..." : "Deploy to Preview & Create PR"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
