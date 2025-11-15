"use client"

import { useEffect, useState } from "react"
import { onAuthStateChanged } from "firebase/auth"
import { auth, db } from "@/lib/firebase"
import { doc, onSnapshot } from "firebase/firestore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface MembershipData {
  plan?: string
  status?: string
  isActive?: boolean
  updatedAt?: any
  createdAt?: any
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  currentPeriodEnd?: any
  cancelAtPeriodEnd?: boolean
  [key: string]: any
}

interface UpdateEvent {
  timestamp: Date
  updatedAt: string
  timeSinceLastUpdate: number | null
}

export default function MembershipMonitorPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [membershipData, setMembershipData] = useState<MembershipData | null>(null)
  const [updateHistory, setUpdateHistory] = useState<UpdateEvent[]>([])
  const [isListening, setIsListening] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [updateCount, setUpdateCount] = useState(0)
  const [averageInterval, setAverageInterval] = useState<number | null>(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid)
      } else {
        setUserId(null)
        setMembershipData(null)
        setUpdateHistory([])
      }
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (!userId) return

    setIsListening(true)
    console.log("[v0] Starting real-time listener for user:", userId.substring(0, 8))

    const membershipRef = doc(db, "memberships", userId)
    
    const unsubscribe = onSnapshot(
      membershipRef,
      (snapshot) => {
        const now = new Date()
        console.log("[v0] Membership document update detected at:", now.toISOString())

        if (snapshot.exists()) {
          const data = snapshot.data() as MembershipData
          setMembershipData(data)

          const updatedAtValue = data.updatedAt
          let updatedAtString = "N/A"
          
          if (updatedAtValue) {
            if (typeof updatedAtValue === "object" && "toDate" in updatedAtValue) {
              updatedAtString = updatedAtValue.toDate().toISOString()
            } else if (updatedAtValue instanceof Date) {
              updatedAtString = updatedAtValue.toISOString()
            } else {
              updatedAtString = String(updatedAtValue)
            }
          }

          const timeSinceLastUpdate = lastUpdate ? now.getTime() - lastUpdate.getTime() : null

          const newEvent: UpdateEvent = {
            timestamp: now,
            updatedAt: updatedAtString,
            timeSinceLastUpdate,
          }

          setUpdateHistory((prev) => [newEvent, ...prev].slice(0, 20))
          setLastUpdate(now)
          setUpdateCount((prev) => prev + 1)

          // Calculate average interval
          if (timeSinceLastUpdate !== null) {
            setAverageInterval((prev) => {
              if (prev === null) return timeSinceLastUpdate
              return (prev + timeSinceLastUpdate) / 2
            })
          }

          console.log("[v0] Document data:", {
            plan: data.plan,
            status: data.status,
            updatedAt: updatedAtString,
            timeSinceLastUpdate: timeSinceLastUpdate ? `${timeSinceLastUpdate}ms` : "first update",
          })
        } else {
          console.log("[v0] Membership document does not exist")
          setMembershipData(null)
        }
      },
      (error) => {
        console.error("[v0] Error listening to membership document:", error)
        setIsListening(false)
      }
    )

    return () => {
      console.log("[v0] Stopping real-time listener")
      unsubscribe()
      setIsListening(false)
    }
  }, [userId])

  if (!userId) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Membership Document Monitor</CardTitle>
            <CardDescription>Please sign in to monitor your membership document</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const isGlitching = averageInterval !== null && averageInterval < 2000

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            Membership Document Monitor
            {isListening && (
              <Badge variant={isGlitching ? "destructive" : "default"}>
                {isGlitching ? "⚠️ Rapid Updates Detected" : "🟢 Listening"}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>Real-time monitoring of updatedAt field changes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">User ID</p>
              <p className="font-mono text-sm">{userId.substring(0, 16)}...</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Updates</p>
              <p className="text-2xl font-bold">{updateCount}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Average Update Interval</p>
              <p className="text-2xl font-bold">
                {averageInterval ? `${(averageInterval / 1000).toFixed(2)}s` : "N/A"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="text-2xl font-bold">
                {isGlitching ? (
                  <span className="text-red-500">GLITCHING</span>
                ) : (
                  <span className="text-green-500">NORMAL</span>
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Membership Data</CardTitle>
        </CardHeader>
        <CardContent>
          {membershipData ? (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Plan</p>
                  <p className="font-semibold">{membershipData.plan || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-semibold">{membershipData.status || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Is Active</p>
                  <p className="font-semibold">{String(membershipData.isActive)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cancel At Period End</p>
                  <p className="font-semibold">{String(membershipData.cancelAtPeriodEnd)}</p>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm text-muted-foreground mb-2">Full Document (JSON)</p>
                <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto max-h-64">
                  {JSON.stringify(membershipData, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">No membership document found</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Update History (Last 20)</CardTitle>
          <CardDescription>
            Shows each time the document was updated, the updatedAt timestamp, and time between updates
          </CardDescription>
        </CardHeader>
        <CardContent>
          {updateHistory.length === 0 ? (
            <p className="text-muted-foreground">No updates detected yet. Listening...</p>
          ) : (
            <div className="space-y-2">
              {updateHistory.map((event, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${
                    event.timeSinceLastUpdate && event.timeSinceLastUpdate < 2000
                      ? "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900"
                      : "bg-muted"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        Update #{updateHistory.length - index}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Detected: {event.timestamp.toLocaleTimeString()}.
                        {event.timestamp.getMilliseconds()}
                      </p>
                      <p className="text-xs font-mono">
                        updatedAt: {event.updatedAt}
                      </p>
                    </div>
                    <div className="text-right">
                      {event.timeSinceLastUpdate !== null && (
                        <Badge
                          variant={event.timeSinceLastUpdate < 2000 ? "destructive" : "secondary"}
                        >
                          +{(event.timeSinceLastUpdate / 1000).toFixed(3)}s
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
