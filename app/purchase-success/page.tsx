"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, Download, ArrowRight } from "lucide-react"
import Link from "next/link"
import { useUser } from "@/hooks/useUser"
import { useSessionId } from "@/hooks/useSessionId"

interface BundleItem {
  id: string
  title: string
  fileSize: number
  downloadUrl: string
  type: string
}

interface Bundle {
  id: string
  title: string
  description: string
  thumbnail: string
  items: BundleItem[]
  totalItems: number
  totalSize: number
}

export default function PurchaseSuccessPage() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get("session_id")
  const { user } = useUser()
  const { storeSessionId } = useSessionId()

  const [bundle, setBundle] = useState<Bundle | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionId) {
      setError("No session ID provided")
      setLoading(false)
      return
    }

    // Store session ID for anonymous access
    storeSessionId(sessionId)

    const verifyPurchase = async () => {
      try {
        console.log("🔍 Verifying purchase with session:", sessionId)

        const response = await fetch("/api/purchase/verify-session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sessionId }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || "Failed to verify purchase")
        }

        console.log("✅ Purchase verified:", data)
        setBundle(data.bundle)
      } catch (err) {
        console.error("❌ Error verifying purchase:", err)
        setError(err instanceof Error ? err.message : "Failed to verify purchase")
      } finally {
        setLoading(false)
      }
    }

    verifyPurchase()
  }, [sessionId, storeSessionId])

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying your purchase...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Purchase Verification Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">{error}</p>
            <Link href="/">
              <Button>Return Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!bundle) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>No Bundle Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Unable to find your purchased bundle.</p>
            <Link href="/">
              <Button>Return Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Success Header */}
        <div className="text-center mb-8">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Purchase Successful!</h1>
          <p className="text-gray-600">Thank you for your purchase. Your content is ready to download.</p>
        </div>

        {/* Bundle Details */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              {bundle.thumbnail && (
                <img
                  src={bundle.thumbnail || "/placeholder.svg"}
                  alt={bundle.title}
                  className="w-12 h-12 rounded-lg object-cover"
                />
              )}
              <div>
                <h2 className="text-xl">{bundle.title}</h2>
                <p className="text-sm text-gray-500 font-normal">
                  {bundle.totalItems} items • {formatFileSize(bundle.totalSize)}
                </p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bundle.description && <p className="text-gray-600 mb-4">{bundle.description}</p>}

            {/* Content Items */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">Included Content:</h3>
              {bundle.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{item.title}</p>
                    <p className="text-sm text-gray-500">
                      {item.type} • {formatFileSize(item.fileSize)}
                    </p>
                  </div>
                  <Button size="sm" variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/dashboard/purchases">
            <Button size="lg" className="w-full sm:w-auto">
              View My Purchases
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
          <Link href="/">
            <Button size="lg" variant="outline" className="w-full sm:w-auto bg-transparent">
              Continue Browsing
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
