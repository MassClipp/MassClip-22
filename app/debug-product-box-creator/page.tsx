"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Package, Check, ArrowRight } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function ProductBoxCreatorPage() {
  const [title, setTitle] = useState("Test Product Box")
  const [description, setDescription] = useState("This is a test product box with sample content")
  const [price, setPrice] = useState("9.99")
  const [currency, setCurrency] = useState("USD")
  const [collectionName, setCollectionName] = useState("productBoxes")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const { user } = useAuth()
  const { toast } = useToast()

  const createProductBox = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "Please log in first",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const token = await user.getIdToken(true)

      const response = await fetch(`/api/debug/create-test-product-box`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          description,
          price: Number.parseFloat(price),
          currency,
          collectionName,
        }),
      })

      const data = await response.json()
      setResult(data)

      if (response.ok) {
        toast({
          title: "Success",
          description: "Product box created successfully",
        })
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to create product box",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create product box",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const viewProductBox = () => {
    if (result?.productBox?.id) {
      window.open(`/product-box/${result.productBox.id}/content`, "_blank")
    }
  }

  const testDirectContent = async () => {
    if (!user || !result?.productBox?.id) return

    try {
      const token = await user.getIdToken(true)

      const response = await fetch(`/api/product-box/${result.productBox.id}/direct-content`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: `Found ${data.content?.length || 0} content items`,
        })
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fetch content",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to test direct content API",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-2">Product Box Creator</h1>
          <p className="text-white/60">Create test product boxes for debugging</p>
        </div>

        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Create Test Product Box</CardTitle>
            <CardDescription className="text-white/60">
              This will create a product box and a purchase record for testing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-white/60 mb-1 block">Title</label>
              <Input
                placeholder="Product box title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-white/5 border-white/20 text-white"
              />
            </div>

            <div>
              <label className="text-sm text-white/60 mb-1 block">Description</label>
              <Textarea
                placeholder="Product box description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-white/5 border-white/20 text-white"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-white/60 mb-1 block">Price</label>
                <Input
                  type="number"
                  placeholder="9.99"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="bg-white/5 border-white/20 text-white"
                />
              </div>

              <div>
                <label className="text-sm text-white/60 mb-1 block">Currency</label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="bg-white/5 border-white/20 text-white">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm text-white/60 mb-1 block">Collection Name</label>
              <Select value={collectionName} onValueChange={setCollectionName}>
                <SelectTrigger className="bg-white/5 border-white/20 text-white">
                  <SelectValue placeholder="Select collection" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="productBoxes">productBoxes</SelectItem>
                  <SelectItem value="product-boxes">product-boxes</SelectItem>
                  <SelectItem value="products">products</SelectItem>
                  <SelectItem value="premium-content">premium-content</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={createProductBox} disabled={loading} className="w-full">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Package className="w-4 h-4 mr-2" />}
              {loading ? "Creating..." : "Create Product Box"}
            </Button>
          </CardContent>
        </Card>

        {result && result.success && (
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Check className="w-5 h-5 text-green-400 mr-2" />
                Product Box Created
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-white/5 p-4 rounded">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="text-white/60 text-sm">Title</div>
                      <div className="text-white font-medium">{result.productBox.title}</div>
                    </div>
                    <div>
                      <div className="text-white/60 text-sm">ID</div>
                      <div className="text-white font-mono text-sm">{result.productBox.id}</div>
                    </div>
                    <div>
                      <div className="text-white/60 text-sm">Price</div>
                      <div className="text-white">
                        {result.productBox.price} {result.productBox.currency}
                      </div>
                    </div>
                    <div>
                      <div className="text-white/60 text-sm">Collection</div>
                      <div className="text-white">{collectionName}</div>
                    </div>
                  </div>

                  <div className="text-white/60 text-sm mb-1">Description</div>
                  <div className="text-white mb-4">{result.productBox.description}</div>

                  <div className="flex gap-3">
                    <Button onClick={viewProductBox} className="flex-1">
                      <ArrowRight className="w-4 h-4 mr-2" />
                      View Product Box
                    </Button>
                    <Button
                      onClick={testDirectContent}
                      variant="outline"
                      className="flex-1 border-white/20 text-white/80 hover:bg-white/10"
                    >
                      Test Direct Content
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
