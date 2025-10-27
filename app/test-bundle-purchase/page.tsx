"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Package, ShoppingCart, CheckCircle, AlertCircle, RefreshCw } from "lucide-react"
import { toast } from "@/hooks/use-toast"

export default function TestBundlePurchasePage() {
  const router = useRouter()
  const [isProcessing, setIsProcessing] = useState(false)
  const [loadingVideos, setLoadingVideos] = useState(true)
  const [testContent, setTestContent] = useState<any[]>([])
  const [testResult, setTestResult] = useState<{
    success: boolean
    sessionId?: string
    message: string
  } | null>(null)

  // Test bundle data
  const testBundle = {
    id: "test-bundle-123",
    title: "Test Content Bundle",
    description: "A test bundle with sample videos for testing the purchase flow",
    price: 29.99,
    currency: "usd",
    thumbnailUrl: "/placeholder.svg?height=400&width=400",
    creatorId: "test-creator-456",
    creatorUsername: "testcreator",
    creatorName: "Test Creator",
  }

  useEffect(() => {
    fetchRandomVideos()
  }, [])

  const fetchRandomVideos = async () => {
    setLoadingVideos(true)
    try {
      const response = await fetch("/api/test/get-random-videos")
      const data = await response.json()

      if (data.success && data.videos) {
        setTestContent(data.videos)
        console.log("[Test] Loaded real videos:", data.videos.length)
      } else {
        throw new Error("Failed to fetch videos")
      }
    } catch (error) {
      console.error("[Test] Error fetching videos:", error)
      toast({
        title: "Warning",
        description: "Could not load real videos, using fallback data",
        variant: "destructive",
      })
    } finally {
      setLoadingVideos(false)
    }
  }

  const simulatePurchase = async () => {
    setIsProcessing(true)
    setTestResult(null)

    try {
      console.log("[Test] Starting simulated purchase...")

      // Generate a test session ID
      const sessionId = `test_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      console.log("[Test] Generated session ID:", sessionId)

      // Create the purchase record via API
      const response = await fetch("/api/test/create-bundle-purchase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          bundleData: testBundle,
          contentData: testContent,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create test purchase")
      }

      const result = await response.json()
      console.log("[Test] Purchase created successfully:", result)

      setTestResult({
        success: true,
        sessionId,
        message: "Test purchase created successfully!",
      })

      toast({
        title: "Test Purchase Created",
        description: "Redirecting to success page...",
      })

      // Wait a moment then redirect to success page
      setTimeout(() => {
        router.push(`/purchase-success?session_id=${sessionId}`)
      }, 1500)
    } catch (error) {
      console.error("[Test] Error:", error)
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : "Failed to create test purchase",
      })

      toast({
        title: "Test Failed",
        description: error instanceof Error ? error.message : "Failed to create test purchase",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  if (loadingVideos) {
    return (
      <div className="min-h-screen bg-black text-white p-6 flex items-center justify-center">
        <Card className="bg-white/5 border-white/20 p-8">
          <div className="flex flex-col items-center gap-4">
            <RefreshCw className="w-8 h-8 animate-spin text-teal-400" />
            <p className="text-lg">Loading real videos from Firestore...</p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Bundle Purchase Test Page</h1>
          <p className="text-gray-400">
            Test the non-authenticated bundle purchase flow and ZIP download functionality
          </p>
        </div>

        {/* Test Bundle Card */}
        <Card className="bg-white/5 border-white/20 p-6 mb-6">
          <div className="flex gap-6">
            <div className="w-32 h-32 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <Package className="w-12 h-12 text-gray-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-2">{testBundle.title}</h2>
              <p className="text-gray-400 mb-4">{testBundle.description}</p>
              <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                <span>{testContent.length} videos</span>
                <span>•</span>
                <span>by {testBundle.creatorUsername}</span>
              </div>
              <div className="text-2xl font-bold text-teal-400">
                ${testBundle.price.toFixed(2)} {testBundle.currency.toUpperCase()}
              </div>
            </div>
          </div>
        </Card>

        {/* Test Content Preview */}
        <Card className="bg-white/5 border-white/20 p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Bundle Contents ({testContent.length} items)</h3>
          <div className="space-y-3">
            {testContent.map((content, index) => (
              <div key={content.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                <div className="w-12 h-12 bg-white/10 rounded flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold">{index + 1}</span>
                </div>
                <div className="flex-1">
                  <div className="font-medium">{content.title}</div>
                  <div className="text-sm text-gray-400">
                    {content.fileType.toUpperCase()} • {(content.size / 1024 / 1024).toFixed(2)} MB •{" "}
                    {Math.floor(content.duration / 60)}:{(content.duration % 60).toString().padStart(2, "0")}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Test Actions */}
        <Card className="bg-white/5 border-white/20 p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Test Actions</h3>
          <div className="space-y-4">
            <div>
              <Button
                onClick={simulatePurchase}
                disabled={isProcessing}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-6 text-lg"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                    Creating Test Purchase...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    Simulate Purchase (No Auth Required)
                  </>
                )}
              </Button>
              <p className="text-sm text-gray-400 mt-2">
                This will create a real bundlePurchases document in Firestore and redirect to the success page
              </p>
            </div>
          </div>
        </Card>

        {/* Test Result */}
        {testResult && (
          <Card
            className={`p-6 ${
              testResult.success ? "bg-green-900/20 border-green-500/50" : "bg-red-900/20 border-red-500/50"
            }`}
          >
            <div className="flex items-start gap-3">
              {testResult.success ? (
                <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <h3 className="font-semibold mb-1">{testResult.success ? "Test Successful" : "Test Failed"}</h3>
                <p className="text-sm text-gray-300 mb-2">{testResult.message}</p>
                {testResult.sessionId && (
                  <div className="text-xs text-gray-400 font-mono bg-black/30 p-2 rounded">
                    Session ID: {testResult.sessionId}
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Test Instructions */}
        <Card className="bg-white/5 border-white/20 p-6 mt-6">
          <h3 className="text-lg font-semibold mb-4">Test Flow</h3>
          <ol className="space-y-2 text-sm text-gray-300">
            <li className="flex gap-2">
              <span className="font-bold text-teal-400">1.</span>
              <span>Click "Simulate Purchase" to create a test bundle purchase without authentication</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-teal-400">2.</span>
              <span>A real bundlePurchases document will be created in Firestore with a sessionId</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-teal-400">3.</span>
              <span>You'll be redirected to the purchase success page</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-teal-400">4.</span>
              <span>On the success page, test the "Download All as ZIP" button</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-teal-400">5.</span>
              <span>The ZIP should download with all 3 test videos included</span>
            </li>
          </ol>
        </Card>
      </div>
    </div>
  )
}
