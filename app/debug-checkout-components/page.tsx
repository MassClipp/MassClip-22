"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function DebugCheckoutComponents() {
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [testCheckoutLoading, setTestCheckoutLoading] = useState(false)
  const [productBoxes, setProductBoxes] = useState<any[]>([])
  const [selectedProductBox, setSelectedProductBox] = useState<string>("")

  // Fetch available product boxes on component mount
  useEffect(() => {
    fetchProductBoxes()
  }, [])

  const fetchProductBoxes = async () => {
    try {
      const response = await fetch("/api/debug/checkout-components/product-boxes")
      if (response.ok) {
        const data = await response.json()
        setProductBoxes(data.productBoxes || [])
        if (data.productBoxes && data.productBoxes.length > 0) {
          setSelectedProductBox(data.productBoxes[0].id)
        }
      }
    } catch (error) {
      console.error("Failed to fetch product boxes:", error)
    }
  }

  const runComponentTests = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/debug/checkout-components")
      const data = await response.json()
      setResults(data)
    } catch (error) {
      console.error("Failed to run tests:", error)
      setResults({ error: "Failed to run tests" })
    } finally {
      setLoading(false)
    }
  }

  const testCheckoutSession = async () => {
    if (!selectedProductBox) {
      alert("Please select a product box first")
      return
    }

    setTestCheckoutLoading(true)
    try {
      const response = await fetch("/api/debug/checkout-components", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productBoxId: selectedProductBox,
        }),
      })

      const data = await response.json()

      if (data.success && data.url) {
        window.open(data.url, "_blank")
      } else {
        alert(`Checkout test failed: ${data.error}`)
        console.error("Checkout test error:", data)
      }
    } catch (error) {
      console.error("Checkout test failed:", error)
      alert("Checkout test failed")
    } finally {
      setTestCheckoutLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Debug Checkout Components</h1>

      <div className="space-y-4">
        <Button onClick={runComponentTests} disabled={loading}>
          {loading ? "Running Tests..." : "Run Component Tests"}
        </Button>

        <div className="flex gap-4 items-center">
          <Select value={selectedProductBox} onValueChange={setSelectedProductBox}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select a product box" />
            </SelectTrigger>
            <SelectContent>
              {productBoxes.map((box) => (
                <SelectItem key={box.id} value={box.id}>
                  {box.title} - ${(box.price / 100).toFixed(2)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={testCheckoutSession} disabled={testCheckoutLoading || !selectedProductBox}>
            {testCheckoutLoading ? "Testing Checkout..." : "Test Checkout Session"}
          </Button>
        </div>

        {productBoxes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Available Product Boxes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {productBoxes.map((box) => (
                  <div key={box.id} className="p-2 border rounded">
                    <div className="font-medium">{box.title}</div>
                    <div className="text-sm text-gray-600">
                      ID: {box.id} | Price: ${(box.price / 100).toFixed(2)} | Creator: {box.creatorId}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {results && (
          <Card>
            <CardHeader>
              <CardTitle>Test Results</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">{JSON.stringify(results, null, 2)}</pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
