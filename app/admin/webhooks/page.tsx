"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { initializeApp } from "firebase/app"
import { getFirestore, collection, query, orderBy, limit, getDocs } from "firebase/firestore"

export default function WebhookDiagnosticPage() {
  const { user } = useAuth()
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [diagnosticResult, setDiagnosticResult] = useState<any>(null)
  const [runningDiagnostic, setRunningDiagnostic] = useState(false)

  useEffect(() => {
    async function fetchEvents() {
      if (!user) return

      try {
        const firebaseConfig = {
          apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
          authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
          messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
          appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
        }

        const app = initializeApp(firebaseConfig)
        const db = getFirestore(app)

        const eventsQuery = query(collection(db, "stripeWebhookEvents"), orderBy("receivedAt", "desc"), limit(20))

        const querySnapshot = await getDocs(eventsQuery)
        const eventsList: any[] = []

        querySnapshot.forEach((doc) => {
          eventsList.push({
            id: doc.id,
            ...doc.data(),
          })
        })

        setEvents(eventsList)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [user])

  const runDiagnostic = async () => {
    setRunningDiagnostic(true)
    try {
      const response = await fetch("/api/webhook-diagnostic")
      const data = await response.json()
      setDiagnosticResult(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setRunningDiagnostic(false)
    }
  }

  if (!user) {
    return <div className="p-8">Please log in to access this page.</div>
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Webhook Diagnostic</h1>

      <div className="mb-8">
        <button
          onClick={runDiagnostic}
          disabled={runningDiagnostic}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
        >
          {runningDiagnostic ? "Running..." : "Run Diagnostic"}
        </button>

        {diagnosticResult && (
          <div className="mt-4 p-4 bg-gray-100 rounded">
            <h2 className="text-lg font-semibold mb-2">Diagnostic Results</h2>
            <pre className="whitespace-pre-wrap text-sm">{JSON.stringify(diagnosticResult, null, 2)}</pre>
          </div>
        )}
      </div>

      <h2 className="text-xl font-semibold mb-4">Recent Webhook Events</h2>

      {error && <div className="text-red-500 mb-4">{error}</div>}

      {loading ? (
        <div>Loading events...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-2 border">Event ID</th>
                <th className="px-4 py-2 border">Type</th>
                <th className="px-4 py-2 border">Received At</th>
                <th className="px-4 py-2 border">Processed</th>
                <th className="px-4 py-2 border">Details</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-2 text-center">
                    No webhook events found
                  </td>
                </tr>
              ) : (
                events.map((event) => (
                  <tr key={event.id}>
                    <td className="px-4 py-2 border">{event.id}</td>
                    <td className="px-4 py-2 border">{event.type}</td>
                    <td className="px-4 py-2 border">{event.receivedAt?.toDate?.()?.toLocaleString() || "N/A"}</td>
                    <td className="px-4 py-2 border">{event.processed ? "✅" : "❌"}</td>
                    <td className="px-4 py-2 border">
                      <details>
                        <summary>View Details</summary>
                        <pre className="whitespace-pre-wrap text-xs mt-2">{JSON.stringify(event, null, 2)}</pre>
                      </details>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
