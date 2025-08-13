"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function StripeSessionsDebug() {
  const [email, setEmail] = useState("johnisworthier103@gmail.com")
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const fetchSessions = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/debug/stripe-sessions?email=${encodeURIComponent(email)}`)
      const data = await response.json()
      setSessions(data.sessions || [])
    } catch (error) {
      console.error("Failed to fetch sessions:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSessions()
  }, [])

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Stripe Sessions Debug</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Filter by email" />
            <Button onClick={fetchSessions} disabled={loading}>
              {loading ? "Loading..." : "Fetch Sessions"}
            </Button>
          </div>

          <div className="space-y-4">
            {sessions.map((session) => (
              <Card key={session.id} className="p-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <strong>ID:</strong> {session.id}
                  </div>
                  <div>
                    <strong>Status:</strong> {session.status}
                  </div>
                  <div>
                    <strong>Email:</strong> {session.customer_email}
                  </div>
                  <div>
                    <strong>Created:</strong> {session.created}
                  </div>
                  <div>
                    <strong>Client Ref ID:</strong> {session.client_reference_id || "None"}
                  </div>
                  <div>
                    <strong>Subscription ID:</strong> {session.subscription_id || "None"}
                  </div>
                  <div className="col-span-2">
                    <strong>Session Metadata:</strong>
                    <pre className="bg-gray-100 p-2 rounded text-xs mt-1">
                      {JSON.stringify(session.metadata, null, 2)}
                    </pre>
                  </div>
                  {session.subscription_metadata && (
                    <div className="col-span-2">
                      <strong>Subscription Metadata:</strong>
                      <pre className="bg-gray-100 p-2 rounded text-xs mt-1">
                        {JSON.stringify(session.subscription_metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
