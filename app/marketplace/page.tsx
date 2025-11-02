"use client"

import { useState, useEffect } from "react"
import { Search, Star } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import Image from "next/image"

interface Bundle {
  id: string
  title: string
  description: string
  price: number
  currency: string
  thumbnailUrl: string
  creatorName: string
  creatorUsername: string
  category: string
  niche: string
  tags: string[]
  rating: number
  reviewCount: number
  salesCount: number
  contentMetadata: {
    totalItems: number
  }
}

const CATEGORIES = [
  "All Categories",
  "Video Editing",
  "Motion Graphics",
  "Sound Effects",
  "Music Loops",
  "Stock Footage",
  "3D Assets",
  "Color Presets",
  "Transitions",
  "Lower Thirds",
  "Intro Templates",
]

export default function MarketplacePage() {
  const [bundles, setBundles] = useState<Bundle[]>([])
  const [filteredBundles, setFilteredBundles] = useState<Bundle[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All Categories")
  const [sortBy, setSortBy] = useState("popular")

  useEffect(() => {
    fetchBundles()
  }, [])

  useEffect(() => {
    filterAndSortBundles()
  }, [bundles, searchQuery, selectedCategory, sortBy])

  async function fetchBundles() {
    try {
      // Fetch all public bundles from Firebase
      const response = await fetch("/api/marketplace/bundles")
      const data = await response.json()

      if (data.success) {
        setBundles(data.bundles)
      }
    } catch (error) {
      console.error("Error fetching bundles:", error)
    } finally {
      setLoading(false)
    }
  }

  function filterAndSortBundles() {
    let filtered = [...bundles]

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (bundle) =>
          bundle.title.toLowerCase().includes(query) ||
          bundle.description.toLowerCase().includes(query) ||
          bundle.tags.some((tag) => tag.toLowerCase().includes(query)) ||
          bundle.category.toLowerCase().includes(query),
      )
    }

    // Filter by category
    if (selectedCategory !== "All Categories") {
      filtered = filtered.filter((bundle) => bundle.category === selectedCategory)
    }

    // Sort bundles
    switch (sortBy) {
      case "popular":
        filtered.sort((a, b) => b.salesCount - a.salesCount)
        break
      case "rating":
        filtered.sort((a, b) => b.rating - a.rating)
        break
      case "price-low":
        filtered.sort((a, b) => a.price - b.price)
        break
      case "price-high":
        filtered.sort((a, b) => b.price - a.price)
        break
      case "newest":
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        break
    }

    setFilteredBundles(filtered)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading marketplace...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-4xl font-bold mb-2">Content Marketplace</h1>
          <p className="text-muted-foreground">Discover premium content bundles from creators around the world</p>
        </div>
      </div>

      {/* Filters */}
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search bundles, categories, tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Category Filter */}
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="popular">Most Popular</SelectItem>
                <SelectItem value="rating">Highest Rated</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Results count */}
          <div className="mt-4 text-sm text-muted-foreground">
            Showing {filteredBundles.length} of {bundles.length} bundles
          </div>
        </div>
      </div>

      {/* Bundle Grid */}
      <div className="container mx-auto px-4 py-8">
        {filteredBundles.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">No bundles found matching your criteria</p>
            <Button
              variant="outline"
              className="mt-4 bg-transparent"
              onClick={() => {
                setSearchQuery("")
                setSelectedCategory("All Categories")
              }}
            >
              Clear Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredBundles.map((bundle) => (
              <Link key={bundle.id} href={`/marketplace/${bundle.id}`}>
                <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader className="p-0">
                    <div className="relative aspect-video w-full overflow-hidden rounded-t-lg">
                      <Image
                        src={bundle.thumbnailUrl || "/placeholder.svg"}
                        alt={bundle.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <CardTitle className="text-lg line-clamp-2">{bundle.title}</CardTitle>
                    </div>
                    <CardDescription className="line-clamp-2 mb-3">{bundle.description}</CardDescription>

                    {/* Creator */}
                    <p className="text-sm text-muted-foreground mb-3">by {bundle.creatorName}</p>

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium">{bundle.rating}</span>
                        <span>({bundle.reviewCount})</span>
                      </div>
                      <div>{bundle.salesCount} sales</div>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      <Badge variant="secondary" className="text-xs">
                        {bundle.category}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {bundle.contentMetadata.totalItems} items
                      </Badge>
                    </div>
                  </CardContent>
                  <CardFooter className="p-4 pt-0">
                    <div className="flex items-center justify-between w-full">
                      <span className="text-2xl font-bold">${bundle.price}</span>
                      <Button size="sm">View Bundle</Button>
                    </div>
                  </CardFooter>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
