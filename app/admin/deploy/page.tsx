"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"

export default function DeploymentAdmin() {
  const [branch, setBranch] = useState<string>("v0dev")
  const [filePath, setFilePath] = useState<string>("")
  const [fileContent, setFileContent] = useState<string>("")
  const [commitMessage, setCommitMessage] = useState<string>("")
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [result, setResult] = useState<{ success?: boolean; message?: string; error?: string } | null>(null)

  const router = useRouter()
  const { user, loading } = useAuth()

  // Protect this page - redirect if not authenticated
  if (typeof window !== "undefined" && !loading && !user) {
    router.push("/login?redirect=/admin/deploy")
    return null
  }

  // Check if user is admin (you may need to adjust this based on your user roles)
  const isAdmin = user?.email === "admin@example.com" || user?.email?.endsWith("@massclip.pro")

  if (!loading && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <h1 className="text-2xl font-bold mb-4 text-center text-red-600">Access Denied</h1>
          <p className="text-gray-600 text-center">You do not have permission to access this page.</p>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/deploy-ai-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          branch,
          file_path: filePath,
          file_content: fileContent,
          commit_message: commitMessage,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setResult({
          success: true,
          message: data.message || "Deployment triggered successfully!",
        })
      } else {
        setResult({
          success: false,
          error: data.error || "Failed to trigger deployment",
        })
      }
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "An unknown error occurred",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow-md rounded-lg p-6">
          <h1 className="text-2xl font-bold mb-6 text-center">AI Code Deployment</h1>

          {result && (
            <div
              className={`mb-6 p-4 rounded-md ${result.success ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}
            >
              {result.success ? result.message : result.error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="branch" className="block text-sm font-medium text-gray-700">
                Target Branch
              </label>
              <select
                id="branch"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                required
              >
                <option value="v0dev">Preview (v0dev)</option>
                <option value="main">Production (main)</option>
              </select>
            </div>

            <div>
              <label htmlFor="filePath" className="block text-sm font-medium text-gray-700">
                File Path
              </label>
              <input
                type="text"
                id="filePath"
                value={filePath}
                onChange={(e) => setFilePath(e.target.value)}
                placeholder="e.g., app/layout.tsx"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                required
              />
            </div>

            <div>
              <label htmlFor="commitMessage" className="block text-sm font-medium text-gray-700">
                Commit Message
              </label>
              <input
                type="text"
                id="commitMessage"
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                placeholder="e.g., Update layout styling"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                required
              />
            </div>

            <div>
              <label htmlFor="fileContent" className="block text-sm font-medium text-gray-700">
                File Content
              </label>
              <textarea
                id="fileContent"
                value={fileContent}
                onChange={(e) => setFileContent(e.target.value)}
                rows={10}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm font-mono"
                required
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isLoading ? "Deploying..." : "Deploy Code"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
