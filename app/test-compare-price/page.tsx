"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { doc, getDoc, updateDoc } from "firebase/firestore"

export default function ComparePriceTestPage() {
  const { user } = useAuth()
  const [bundleId, setBundleId] = useState("")
  const [bundleData, setBundleData] = useState<any>(null)
  const [testComparePrice, setTestComparePrice] = useState("")
  const [loading, setLoading] = useState(false)
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    console.log(`[v0] ${message}`)
    setLogs((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const fetchBundleData = async () => {
    if (!bundleId.trim()) {
      addLog("❌ Please enter a bundle ID")
      return
    }

    try {
      setLoading(true)
      addLog(`🔍 Fetching bundle data for ID: ${bundleId}`)

      const bundleRef = doc(db, "bundles", bundleId)
      const bundleDoc = await getDoc(bundleRef)

      if (!bundleDoc.exists()) {
        addLog("❌ Bundle not found in Firestore")
        setBundleData(null)
        return
      }

      const data = bundleDoc.data()
      setBundleData(data)

      addLog(`✅ Bundle found: ${data.title}`)
      addLog(`💰 Current price: $${data.price}`)
      addLog(`🏷️ Current comparePrice: ${data.comparePrice || "null"}`)
      addLog(`📊 Raw comparePrice field type: ${typeof data.comparePrice}`)
      addLog(`📋 Raw comparePrice value: ${JSON.stringify(data.comparePrice)}`)
    } catch (error: any) {
      addLog(`❌ Error fetching bundle: ${error.message}`)
      setBundleData(null)
    } finally {
      setLoading(false)
    }
  }

  const testDirectFirestoreUpdate = async () => {
    if (!bundleId.trim() || !testComparePrice.trim()) {
      addLog("❌ Please enter bundle ID and compare price")
      return
    }

    try {
      setLoading(true)
      const compareValue = Number.parseFloat(testComparePrice)

      addLog(`🧪 Testing direct Firestore update...`)
      addLog(`📝 Setting comparePrice to: ${compareValue} (type: ${typeof compareValue})`)

      const bundleRef = doc(db, "bundles", bundleId)
      await updateDoc(bundleRef, {
        comparePrice: compareValue,
        updatedAt: new Date(),
      })

      addLog(`✅ Direct Firestore update completed`)

      // Fetch updated data
      setTimeout(() => {
        fetchBundleData()
      }, 1000)
    } catch (error: any) {
      addLog(`❌ Error updating Firestore: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const testAPIUpdate = async () => {
    if (!bundleId.trim() || !testComparePrice.trim() || !user) {
      addLog("❌ Please enter bundle ID, compare price, and ensure you're logged in")
      return
    }

    try {
      setLoading(true)
      const compareValue = Number.parseFloat(testComparePrice)

      addLog(`🌐 Testing API update...`)
      addLog(`📝 Sending comparePrice: ${compareValue} to API`)

      const idToken = await user.getIdToken()

      const response = await fetch("/api/creator/bundles", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          bundleId,
          title: bundleData?.title || "Test Bundle",
          description: bundleData?.description || "Test Description",
          price: bundleData?.price || 10,
          comparePrice: compareValue,
          billingType: "one_time",
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        addLog(`❌ API Error: ${errorData.error}`)
        return
      }

      const result = await response.json()
      addLog(`✅ API update successful`)
      addLog(`📊 API response comparePrice: ${result.bundle?.comparePrice}`)

      // Fetch updated data
      setTimeout(() => {
        fetchBundleData()
      }, 1000)
    } catch (error: any) {
      addLog(`❌ Error calling API: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const clearLogs = () => {
    setLogs([])
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Compare Price Debug Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Bundle ID</label>
            <Input
              value={bundleId}
              onChange={(e) => setBundleId(e.target.value)}
              placeholder="Enter bundle ID to test"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Test Compare Price</label>
            <Input
              type="number"
              step="0.01"
              value={testComparePrice}
              onChange={(e) => setTestComparePrice(e.target.value)}
              placeholder="19.99"
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={fetchBundleData} disabled={loading}>
              Fetch Bundle Data
            </Button>
            <Button onClick={testDirectFirestoreUpdate} disabled={loading} variant="outline">
              Test Direct Firestore Update
            </Button>
            <Button onClick={testAPIUpdate} disabled={loading} variant="outline">
              Test API Update
            </Button>
            <Button onClick={clearLogs} variant="ghost">
              Clear Logs
            </Button>
          </div>
        </CardContent>
      </Card>

      {bundleData && (
        <Card>
          <CardHeader>
            <CardTitle>Current Bundle Data</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div>
                <strong>Title:</strong> {bundleData.title}
              </div>
              <div>
                <strong>Price:</strong> ${bundleData.price}
              </div>
              <div>
                <strong>Compare Price:</strong> {bundleData.comparePrice || "null"}
              </div>
              <div>
                <strong>Compare Price Type:</strong> {typeof bundleData.comparePrice}
              </div>
              <div>
                <strong>Last Updated:</strong> {bundleData.updatedAt?.toDate?.()?.toLocaleString() || "Unknown"}
              </div>
            </div>

            <details className="mt-4">
              <summary className="cursor-pointer font-medium">Raw Bundle Data</summary>
              <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                {JSON.stringify(bundleData, null, 2)}
              </pre>
            </details>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Debug Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-black text-green-400 p-4 rounded font-mono text-sm max-h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="text-gray-500">No logs yet...</div>
            ) : (
              logs.map((log, index) => <div key={index}>{log}</div>)
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
