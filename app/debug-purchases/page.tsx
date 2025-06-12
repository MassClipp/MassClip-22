"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"

export default function DebugPurchasesPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const testPurchasesAPI = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to test the purchases API",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const token = await user.getIdToken()
      const response = await fetch("/api/user/purchases", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()
      setResult({
        status: response.status,
        success: response.ok,
        data,
      })

      if (response.ok) {
        toast({
          title: "API test successful",
          description: `Found ${data.purchases?.length || 0} purchases`,
        })
      } else {
        toast({
          title: "API test failed",
          description: data.error || "Unknown error",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("API test error:", error)
      setResult({
        status: 0,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      })
      toast({
        title: "API test failed",
        description: "Network or connection error",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const createTestData = async () => {
    if (!user) return

    setLoading(true)
    try {
      const response = await fetch("/api/test/create-sample-purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid }),
      })

      const data = await response.json()
      if (data.success) {
        toast({
          title: "Test data created",
          description: "Sample purchases have been created",
        })
      } else {
        toast({
          title: "Failed to create test data",
          description: data.error || "Unknown error",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error creating test data",
        description: "Failed to create sample purchases",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Debug Purchases API</h1>
        <p className="text-zinc-400 mt-2">Test and debug the purchases functionality</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>User Status</CardTitle>
          </CardHeader>
          <CardContent>
            {user ? (
              <div className="space-y-2">
                <Badge variant="outline" className="border-green-500 text-green-400">
                  Authenticated
                </Badge>
                <p className="text-sm text-zinc-400">User ID: {user.uid}</p>
                <p className="text-sm text-zinc-400">Email: {user.email}</p>
              </div>
            ) : (
              <Badge variant="outline" className="border-red-500 text-red-400">
                Not Authenticated
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>API Tests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Button onClick={testPurchasesAPI} disabled={loading || !user}>
                {loading ? "Testing..." : "Test Purchases API"}
              </Button>
              <Button onClick={createTestData} disabled={loading || !user} variant="outline">
                Create Test Data
              </Button>
            </div>

            {result && (
              <div className="mt-4 p-4 bg-zinc-900 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={result.success ? "default" : "destructive"}>Status: {result.status}</Badge>
                  <Badge variant={result.success ? "default" : "destructive"}>
                    {result.success ? "Success" : "Failed"}
                  </Badge>
                </div>
                <pre className="text-xs text-zinc-400 overflow-auto">{JSON.stringify(result, null, 2)}</pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
