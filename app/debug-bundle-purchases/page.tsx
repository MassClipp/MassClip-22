"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Database, CheckCircle, XCircle } from "lucide-react"

export default function DebugBundlePurchasesPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const checkBundlePurchases = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch("/api/debug/check-bundle-purchases")
      const data = await response.json()

      if (response.ok) {
        setResult(data)
      } else {
        setError(data.error || "Failed to check bundle purchases")
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Debug Bundle Purchases</h1>
        <p className="text-white/70">Check the bundlePurchases collection status</p>
      </div>

      <Card className="bg-black/40 backdrop-blur-xl border-white/10 mb-6">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Database className="h-5 w-5 mr-2" />
            Bundle Purchases Collection Check
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={checkBundlePurchases} disabled={loading} className="bg-red-600 hover:bg-red-700">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <Database className="h-4 w-4 mr-2" />
                Check Bundle Purchases
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Alert className="bg-red-500/10 border-red-500/20 mb-6">
          <XCircle className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-red-200">
            <strong>Error:</strong> {error}
          </AlertDescription>
        </Alert>
      )}

      {result && (
        <Card className="bg-black/40 backdrop-blur-xl border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <CheckCircle className="h-5 w-5 mr-2 text-green-400" />
              Collection Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 p-4 rounded-lg">
                <div className="text-2xl font-bold text-white">{result.totalPurchases}</div>
                <div className="text-sm text-white/60">Total Purchases</div>
              </div>
              <div className="bg-white/5 p-4 rounded-lg">
                <div className="text-2xl font-bold text-white">{result.bundlePurchasesExists ? "✅" : "❌"}</div>
                <div className="text-sm text-white/60">Collection Exists</div>
              </div>
            </div>

            {result.purchases && result.purchases.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Recent Purchases</h3>
                <div className="space-y-2">
                  {result.purchases.slice(0, 5).map((purchase: any, index: number) => (
                    <div key={index} className="bg-white/5 p-3 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-white font-medium">{purchase.title}</div>
                          <div className="text-sm text-white/60">
                            Buyer: {purchase.buyerUid} • ${purchase.amount}
                          </div>
                        </div>
                        <div className="text-xs text-white/40">{purchase.sessionId}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Available Collections</h3>
              <div className="flex flex-wrap gap-2">
                {result.availableCollections.map((collection: string) => (
                  <span
                    key={collection}
                    className={`px-2 py-1 rounded text-xs ${
                      collection === "bundlePurchases" ? "bg-green-500/20 text-green-300" : "bg-white/10 text-white/60"
                    }`}
                  >
                    {collection}
                  </span>
                ))}
              </div>
            </div>

            <pre className="bg-black/20 p-4 rounded-lg text-xs text-white/80 overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
