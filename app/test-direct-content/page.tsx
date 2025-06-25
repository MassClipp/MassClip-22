"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Play, Video } from "lucide-react"

export default function TestDirectContentPage() {
  const [productBoxId, setProductBoxId] = useState("6KctqR330CaE0M6pJ")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const { user } = useAuth()
  const { toast } = useToast()

  const testDirectContent = async () => {
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

      const response = await fetch(`/api/product-box/${productBoxId}/direct-content`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()
      setResult(data)

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
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-2">Test Direct Content API</h1>
          <p className="text-white/60">Test the direct video content retrieval</p>
        </div>

        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Direct Content Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Input
                placeholder="Product Box ID"
                value={productBoxId}
                onChange={(e) => setProductBoxId(e.target.value)}
                className="flex-1 bg-white/5 border-white/20 text-white"
              />
              <Button onClick={testDirectContent} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                Test API
              </Button>
            </div>
          </CardContent>
        </Card>

        {result && (
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-white/60 text-sm">Status</div>
                    <div className="text-white">{result.success ? "Success" : "Error"}</div>
                  </div>
                  <div>
                    <div className="text-white/60 text-sm">Content Items</div>
                    <div className="text-white">{result.content?.length || 0}</div>
                  </div>
                </div>

                {result.content && result.content.length > 0 && (
                  <div>
                    <h4 className="text-white font-semibold mb-2">Content Items:</h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {result.content.map((item: any, index: number) => (
                        <div key={index} className="bg-white/5 p-3 rounded border border-white/10">
                          <div className="flex items-center gap-3">
                            <Video className="w-5 h-5 text-green-400" />
                            <div className="flex-1">
                              <div className="text-white font-medium">{item.title || item.originalFileName}</div>
                              <div className="text-white/60 text-sm">
                                {item.fileType} • {item.category} • {(item.fileSize / 1024 / 1024).toFixed(1)}MB
                              </div>
                              <div className="text-white/40 text-xs font-mono">{item.publicUrl}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-zinc-900 p-4 rounded border border-white/10">
                  <div className="text-white/60 text-sm mb-2">Raw Response:</div>
                  <pre className="text-xs text-white/80 overflow-auto max-h-32">{JSON.stringify(result, null, 2)}</pre>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
