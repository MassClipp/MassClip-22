"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function DebugCreateMembershipPage() {
  const [email, setEmail] = useState("johnisworthier103@gmail.com")
  const [userId, setUserId] = useState("")
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const createMembership = async () => {
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/debug/create-membership-manual", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, userId }),
      })

      const data = await response.json()
      setResult(data)
    } catch (error: any) {
      setResult({ error: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Manual Membership Creation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">User ID (optional)</label>
            <Input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="Firebase UID" />
          </div>

          <Button onClick={createMembership} disabled={loading}>
            {loading ? "Creating..." : "Create Membership"}
          </Button>

          {result && (
            <Alert className={result.error ? "border-red-500" : "border-green-500"}>
              <AlertDescription>
                <pre className="whitespace-pre-wrap text-sm">{JSON.stringify(result, null, 2)}</pre>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
