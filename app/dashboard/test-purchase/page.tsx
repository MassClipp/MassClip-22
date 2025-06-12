"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import {
  Play,
  Download,
  Calendar,
  DollarSign,
  User,
  Package,
  ExternalLink,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  FileText,
  Check,
} from "lucide-react"
import { motion } from "framer-motion"
import { format } from "date-fns"
import Image from "next/image"

// Mock data for testing
const mockCreators = [
  {
    id: "creator1",
    name: "John Creator",
    username: "johncreator",
    profilePic: "/placeholder.svg?height=100&width=100",
  },
  {
    id: "creator2",
    name: "Sarah Designer",
    username: "sarahdesigns",
    profilePic: "/placeholder.svg?height=100&width=100",
  },
  {
    id: "creator3",
    name: "Mike Filmmaker",
    username: "mikefilms",
    profilePic: "/placeholder.svg?height=100&width=100",
  },
]

const mockProductBoxes = [
  {
    id: "product1",
    title: "Premium Video Bundle",
    description: "A collection of my best filmmaking tutorials",
    price: 19.99,
    currency: "usd",
    creatorId: "creator1",
    thumbnailUrl: "/placeholder.svg?height=300&width=500",
    contentItems: [
      {
        id: "item1",
        title: "Advanced Editing Techniques",
        type: "video",
        fileSize: 256000000,
        duration: 1845,
        thumbnailUrl: "/placeholder.svg?height=200&width=300",
        description: "Learn professional video editing techniques used in Hollywood",
      },
      {
        id: "item2",
        title: "Color Grading Masterclass",
        type: "video",
        fileSize: 189000000,
        duration: 1532,
        thumbnailUrl: "/placeholder.svg?height=200&width=300",
        description: "Professional color grading techniques for cinematic looks",
      },
      {
        id: "item3",
        title: "Project Files",
        type: "zip",
        fileSize: 450000000,
        thumbnailUrl: "/placeholder.svg?height=200&width=300",
        description: "All project files and assets used in the tutorials",
      },
    ],
  },
  {
    id: "product2",
    title: "Design Resource Pack",
    description: "Premium design templates and assets",
    price: 24.99,
    currency: "usd",
    creatorId: "creator2",
    thumbnailUrl: "/placeholder.svg?height=300&width=500",
    contentItems: [
      {
        id: "item4",
        title: "UI Kit - Dark Mode",
        type: "psd",
        fileSize: 125000000,
        thumbnailUrl: "/placeholder.svg?height=200&width=300",
        description: "Complete UI kit with dark mode components",
      },
      {
        id: "item5",
        title: "Icon Pack - 500 Icons",
        type: "svg",
        fileSize: 45000000,
        thumbnailUrl: "/placeholder.svg?height=200&width=300",
        description: "500 vector icons in multiple formats",
      },
    ],
  },
  {
    id: "product3",
    title: "Cinematic LUTs Collection",
    description: "Professional color grading presets",
    price: 14.99,
    currency: "usd",
    creatorId: "creator3",
    thumbnailUrl: "/placeholder.svg?height=300&width=500",
    contentItems: [
      {
        id: "item6",
        title: "Hollywood LUTs Pack",
        type: "cube",
        fileSize: 15000000,
        thumbnailUrl: "/placeholder.svg?height=200&width=300",
        description: "10 LUTs inspired by blockbuster movies",
      },
      {
        id: "item7",
        title: "Vintage Film Look",
        type: "cube",
        fileSize: 12000000,
        thumbnailUrl: "/placeholder.svg?height=200&width=300",
        description: "8 LUTs that recreate classic film stocks",
      },
      {
        id: "item8",
        title: "Tutorial: Using LUTs",
        type: "video",
        fileSize: 85000000,
        duration: 845,
        thumbnailUrl: "/placeholder.svg?height=200&width=300",
        description: "How to apply and customize LUTs in your workflow",
      },
    ],
  },
]

// Helper functions
const formatFileSize = (bytes: number) => {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
}

const formatDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
}

const formatPrice = (amount: number, currency: string) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount)
}

export default function TestPurchasePage() {
  const { user } = useAuth()
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null)
  const [purchasedProducts, setPurchasedProducts] = useState<string[]>([])
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showInPurchases, setShowInPurchases] = useState(true)

  // Get creator info for a product
  const getCreatorForProduct = (productId: string) => {
    const product = mockProductBoxes.find((p) => p.id === productId)
    if (!product) return null
    return mockCreators.find((c) => c.id === product.creatorId) || null
  }

  // Simulate purchase
  const handlePurchase = (productId: string) => {
    setLoading(true)

    // Simulate API call
    setTimeout(() => {
      setPurchasedProducts((prev) => [...prev, productId])
      toast.success("Product purchased successfully!")
      setLoading(false)
    }, 1500)
  }

  // Toggle product expansion
  const toggleExpand = (productId: string) => {
    setExpandedProduct(expandedProduct === productId ? null : productId)
  }

  // Reset purchases
  const resetPurchases = () => {
    setPurchasedProducts([])
    toast.info("Purchase history cleared")
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
            Purchase Test Page
          </h1>
          <p className="text-zinc-400 mt-1">Test the product purchase flow and display in My Purchases</p>
        </div>

        <div className="flex gap-3">
          <Button onClick={resetPurchases} variant="outline" className="border-zinc-700 hover:bg-zinc-800">
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset Purchases
          </Button>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Switch id="show-purchases" checked={showInPurchases} onCheckedChange={setShowInPurchases} />
        <Label htmlFor="show-purchases">Show purchases view</Label>
      </div>

      <Tabs defaultValue="products" className="space-y-6">
        <TabsList className="bg-zinc-900/50 border border-zinc-800">
          <TabsTrigger value="products">Available Products</TabsTrigger>
          <TabsTrigger value="purchases">My Purchases ({purchasedProducts.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mockProductBoxes.map((product) => {
              const creator = getCreatorForProduct(product.id)
              const isPurchased = purchasedProducts.includes(product.id)

              return (
                <Card
                  key={product.id}
                  className="bg-zinc-900/60 border-zinc-800/50 backdrop-blur-sm hover:border-zinc-700/50 transition-all duration-300 h-full flex flex-col"
                >
                  {/* Cover Image */}
                  <div className="h-48 bg-zinc-800 rounded-t-lg overflow-hidden relative flex-shrink-0">
                    <Image
                      src={product.thumbnailUrl || "/placeholder.svg"}
                      alt={product.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />

                    {/* Purchase Status Badge */}
                    {isPurchased && (
                      <div className="absolute top-2 right-2">
                        <Badge className="bg-green-500 text-white">Purchased</Badge>
                      </div>
                    )}
                  </div>

                  <CardHeader>
                    <div className="space-y-2">
                      <CardTitle className="text-lg text-white">{product.title}</CardTitle>
                      {product.description && (
                        <CardDescription className="text-zinc-400 text-sm">{product.description}</CardDescription>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0 flex-1 flex flex-col">
                    <div className="space-y-4 flex-1">
                      {/* Creator Info */}
                      {creator && (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full overflow-hidden bg-zinc-800">
                            <Image
                              src={creator.profilePic || "/placeholder.svg"}
                              alt={creator.name}
                              width={24}
                              height={24}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <span className="text-sm text-zinc-400">{creator.name}</span>
                        </div>
                      )}

                      {/* Price Display */}
                      <div className="flex items-center text-xl font-bold text-white">
                        <DollarSign className="h-5 w-5 text-green-500 mr-1" />
                        {formatPrice(product.price, product.currency)}
                      </div>

                      {/* Content Count */}
                      <div className="text-sm text-zinc-400">
                        {product.contentItems.length} content item{product.contentItems.length !== 1 ? "s" : ""}
                      </div>

                      {/* Action Button */}
                      <div className="mt-4 pt-4 border-t border-zinc-800/50">
                        <Button
                          onClick={() => handlePurchase(product.id)}
                          disabled={isPurchased || loading}
                          className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-medium"
                        >
                          {isPurchased ? (
                            <>
                              <Check className="h-4 w-4 mr-2" />
                              Purchased
                            </>
                          ) : loading ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <DollarSign className="h-4 w-4 mr-2" />
                              Purchase
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="purchases" className="space-y-6">
          {purchasedProducts.length > 0 ? (
            <div className="space-y-4">
              {purchasedProducts.map((productId) => {
                const product = mockProductBoxes.find((p) => p.id === productId)
                const creator = getCreatorForProduct(productId)

                if (!product) return null

                return (
                  <Card
                    key={productId}
                    className="bg-gradient-to-br from-zinc-900/80 to-zinc-800/30 border-zinc-800/50 backdrop-blur-sm overflow-hidden relative group hover:border-zinc-700/50 transition-all duration-300"
                  >
                    <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-soft-light"></div>
                    <div className="relative">
                      <CardContent className="p-0">
                        <div className="flex gap-4 p-4">
                          {/* Thumbnail */}
                          <div className="aspect-video w-32 bg-zinc-800 rounded-lg overflow-hidden relative flex-shrink-0">
                            {product.thumbnailUrl ? (
                              <Image
                                src={product.thumbnailUrl || "/placeholder.svg"}
                                alt={product.title}
                                width={128}
                                height={72}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="h-8 w-8 text-zinc-600" />
                              </div>
                            )}

                            {/* Type badge */}
                            <div className="absolute top-2 left-2">
                              <Badge
                                variant="outline"
                                className="text-xs border-purple-500 text-purple-400 bg-purple-500/10"
                              >
                                Bundle
                              </Badge>
                            </div>

                            {/* Status badge */}
                            <div className="absolute top-2 right-2">
                              <Badge
                                variant="outline"
                                className="text-xs border-green-500 text-green-400 bg-green-500/10"
                              >
                                completed
                              </Badge>
                            </div>
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="space-y-2">
                              <h3 className="text-lg font-semibold text-white truncate">{product.title}</h3>

                              {product.description && (
                                <p className="text-sm text-zinc-400 line-clamp-2">{product.description}</p>
                              )}

                              <div className="flex items-center gap-4 text-xs text-zinc-500">
                                {creator && (
                                  <div className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    <span>{creator.name}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  <span>{format(new Date(), "MMM d, yyyy")}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <DollarSign className="h-3 w-3" />
                                  <span>{formatPrice(product.price, product.currency)}</span>
                                </div>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 mt-4">
                              <Button
                                onClick={() => toggleExpand(productId)}
                                className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 border-none shadow-lg shadow-red-900/20"
                              >
                                <Play className="h-4 w-4 mr-2" />
                                Access
                              </Button>

                              <Button
                                variant="outline"
                                onClick={() => creator && window.open(`/creator/${creator.username}`, "_blank")}
                                className="border-zinc-700 hover:bg-zinc-800"
                              >
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Creator
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* Expanded Content */}
                        {expandedProduct === productId && (
                          <div className="pt-4 pb-6 px-4 mt-2 border-t border-zinc-800/50">
                            <h4 className="text-sm font-medium text-white mb-3">Bundle Contents:</h4>

                            <div className="space-y-3">
                              {product.contentItems.map((item) => (
                                <div
                                  key={item.id}
                                  className="flex gap-3 p-3 bg-zinc-800/30 rounded-lg border border-zinc-700/30"
                                >
                                  {/* Thumbnail */}
                                  <div className="w-16 h-12 bg-zinc-700 rounded overflow-hidden flex-shrink-0">
                                    {item.thumbnailUrl ? (
                                      <Image
                                        src={item.thumbnailUrl || "/placeholder.svg"}
                                        alt={item.title}
                                        width={64}
                                        height={48}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center">
                                        {item.type === "video" ? (
                                          <Play className="h-4 w-4 text-zinc-500" />
                                        ) : (
                                          <FileText className="h-4 w-4 text-zinc-500" />
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  {/* Content Info */}
                                  <div className="flex-1 min-w-0">
                                    <h5 className="text-sm font-medium text-white truncate">{item.title}</h5>
                                    <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1">
                                      {item.type && <span className="uppercase">{item.type}</span>}
                                      {item.duration && <span>{formatDuration(item.duration)}</span>}
                                      {item.fileSize && <span>{formatFileSize(item.fileSize)}</span>}
                                    </div>
                                    {item.description && (
                                      <p className="text-xs text-zinc-500 mt-1 line-clamp-1">{item.description}</p>
                                    )}
                                  </div>

                                  {/* Download Button */}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => toast.success(`Downloading ${item.title}`)}
                                    className="border-zinc-600 hover:bg-zinc-700"
                                  >
                                    <Download className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </div>
                  </Card>
                )
              })}
            </div>
          ) : (
            <Card className="bg-gradient-to-br from-zinc-900/80 to-zinc-800/30 border-zinc-800/50 backdrop-blur-sm">
              <CardContent className="p-12 text-center">
                <Package className="h-16 w-16 text-zinc-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No Purchases Yet</h3>
                <p className="text-zinc-400 mb-6">
                  Purchase a product from the Available Products tab to see it appear here.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* My Purchases View */}
      {showInPurchases && purchasedProducts.length > 0 && (
        <>
          <Separator className="my-8" />

          <div>
            <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent mb-6">
              My Purchases Page Preview
            </h2>

            <motion.div
              className="space-y-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              {purchasedProducts.map((productId) => {
                const product = mockProductBoxes.find((p) => p.id === productId)
                const creator = getCreatorForProduct(productId)

                if (!product) return null

                return (
                  <motion.div key={productId} initial={{ y: 20 }} animate={{ y: 0 }} transition={{ duration: 0.5 }}>
                    <Card className="bg-gradient-to-br from-zinc-900/80 to-zinc-800/30 border-zinc-800/50 backdrop-blur-sm overflow-hidden relative group hover:border-zinc-700/50 transition-all duration-300">
                      <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-soft-light"></div>
                      <div className="relative">
                        <CardContent className="p-0">
                          <div className="flex gap-4 p-4">
                            {/* Thumbnail */}
                            <div className="aspect-video w-32 bg-zinc-800 rounded-lg overflow-hidden relative flex-shrink-0">
                              {product.thumbnailUrl ? (
                                <Image
                                  src={product.thumbnailUrl || "/placeholder.svg"}
                                  alt={product.title}
                                  width={128}
                                  height={72}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Package className="h-8 w-8 text-zinc-600" />
                                </div>
                              )}

                              {/* Type badge */}
                              <div className="absolute top-2 left-2">
                                <Badge
                                  variant="outline"
                                  className="text-xs border-purple-500 text-purple-400 bg-purple-500/10"
                                >
                                  Bundle
                                </Badge>
                              </div>

                              {/* Status badge */}
                              <div className="absolute top-2 right-2">
                                <Badge
                                  variant="outline"
                                  className="text-xs border-green-500 text-green-400 bg-green-500/10"
                                >
                                  completed
                                </Badge>
                              </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="space-y-2">
                                <h3 className="text-lg font-semibold text-white truncate">{product.title}</h3>

                                {product.description && (
                                  <p className="text-sm text-zinc-400 line-clamp-2">{product.description}</p>
                                )}

                                <div className="flex items-center gap-4 text-xs text-zinc-500">
                                  {creator && (
                                    <div className="flex items-center gap-1">
                                      <User className="h-3 w-3" />
                                      <span>{creator.name}</span>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    <span>{format(new Date(), "MMM d, yyyy")}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <DollarSign className="h-3 w-3" />
                                    <span>{formatPrice(product.price, product.currency)}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex gap-2 mt-4">
                                <Button
                                  onClick={() => toggleExpand(productId)}
                                  className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 border-none shadow-lg shadow-red-900/20"
                                >
                                  {expandedProduct === productId ? (
                                    <>
                                      <ChevronUp className="h-4 w-4 mr-2" />
                                      Hide Content
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown className="h-4 w-4 mr-2" />
                                      View Content
                                    </>
                                  )}
                                </Button>

                                {creator && (
                                  <Button
                                    variant="outline"
                                    onClick={() => window.open(`/creator/${creator.username}`, "_blank")}
                                    className="border-zinc-700 hover:bg-zinc-800"
                                  >
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    Creator
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Expanded Content */}
                          {expandedProduct === productId && (
                            <div className="pt-4 pb-6 px-4 mt-2 border-t border-zinc-800/50">
                              <h4 className="text-sm font-medium text-white mb-3">Bundle Contents:</h4>

                              <div className="space-y-3">
                                {product.contentItems.map((item) => (
                                  <div
                                    key={item.id}
                                    className="flex gap-3 p-3 bg-zinc-800/30 rounded-lg border border-zinc-700/30"
                                  >
                                    {/* Thumbnail */}
                                    <div className="w-16 h-12 bg-zinc-700 rounded overflow-hidden flex-shrink-0">
                                      {item.thumbnailUrl ? (
                                        <Image
                                          src={item.thumbnailUrl || "/placeholder.svg"}
                                          alt={item.title}
                                          width={64}
                                          height={48}
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                          {item.type === "video" ? (
                                            <Play className="h-4 w-4 text-zinc-500" />
                                          ) : (
                                            <FileText className="h-4 w-4 text-zinc-500" />
                                          )}
                                        </div>
                                      )}
                                    </div>

                                    {/* Content Info */}
                                    <div className="flex-1 min-w-0">
                                      <h5 className="text-sm font-medium text-white truncate">{item.title}</h5>
                                      <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1">
                                        {item.type && <span className="uppercase">{item.type}</span>}
                                        {item.duration && <span>{formatDuration(item.duration)}</span>}
                                        {item.fileSize && <span>{formatFileSize(item.fileSize)}</span>}
                                      </div>
                                      {item.description && (
                                        <p className="text-xs text-zinc-500 mt-1 line-clamp-1">{item.description}</p>
                                      )}
                                    </div>

                                    {/* Download Button */}
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => toast.success(`Downloading ${item.title}`)}
                                      className="border-zinc-600 hover:bg-zinc-700"
                                    >
                                      <Download className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </div>
                    </Card>
                  </motion.div>
                )
              })}
            </motion.div>
          </div>
        </>
      )}
    </div>
  )
}
