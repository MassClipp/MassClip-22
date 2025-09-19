"use client"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, ArrowRight, Search } from "lucide-react"

const BlogPage = () => {
  const blogPosts = [
    {
      id: 1,
      title: "How to use free content",
      excerpt:
        "Learn how to effectively leverage free content to build your audience and establish credibility before monetizing your creations.",
      category: "Getting Started",
      readTime: "5 min read",
      publishDate: "2025-01-15",
      image: "/placeholder.svg?height=200&width=400",
      slug: "how-to-use-free-content",
    },
    {
      id: 2,
      title: "How to optimize your storefront",
      excerpt:
        "Discover proven strategies to make your MassClip storefront more appealing and increase your conversion rates.",
      category: "Optimization",
      readTime: "8 min read",
      publishDate: "2025-01-12",
      image: "/placeholder.svg?height=200&width=400",
      slug: "how-to-optimize-your-storefront",
    },
    {
      id: 3,
      title: "How to organize your bundles",
      excerpt: "Master the art of creating compelling content bundles that provide maximum value to your customers.",
      category: "Organization",
      readTime: "6 min read",
      publishDate: "2025-01-10",
      image: "/placeholder.svg?height=200&width=400",
      slug: "how-to-organize-your-bundles",
    },
    {
      id: 4,
      title: "Pricing strategies for faceless content",
      excerpt:
        "Find the sweet spot for pricing your content to maximize revenue while staying competitive in the market.",
      category: "Monetization",
      readTime: "7 min read",
      publishDate: "2025-01-08",
      image: "/placeholder.svg?height=200&width=400",
      slug: "pricing-strategies-for-faceless-content",
    },
    {
      id: 5,
      title: "Building your brand as a faceless creator",
      excerpt:
        "Establish a strong brand identity without showing your face, using visual elements and consistent messaging.",
      category: "Branding",
      readTime: "10 min read",
      publishDate: "2025-01-05",
      image: "/placeholder.svg?height=200&width=400",
      slug: "building-your-brand-as-faceless-creator",
    },
    {
      id: 6,
      title: "Content creation tools and workflows",
      excerpt: "Streamline your content creation process with the right tools and efficient workflows that save time.",
      category: "Tools",
      readTime: "12 min read",
      publishDate: "2025-01-03",
      image: "/placeholder.svg?height=200&width=400",
      slug: "content-creation-tools-and-workflows",
    },
  ]

  const categories = ["All", "Getting Started", "Optimization", "Organization", "Monetization", "Branding", "Tools"]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <nav className="flex items-center justify-between">
            <Link href="/" className="text-foreground font-light text-2xl">
              Mass<span className="text-accent">Clip</span>
            </Link>

            <div className="hidden md:flex items-center space-x-8">
              <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
                Home
              </Link>
              <Link href="/blog" className="text-foreground font-medium">
                Blog
              </Link>
              <Link href="/dashboard/explore" className="text-muted-foreground hover:text-foreground transition-colors">
                Explore
              </Link>
              <Link href="/about" className="text-muted-foreground hover:text-foreground transition-colors">
                About
              </Link>
            </div>

            <Link href="/login" className="text-muted-foreground hover:text-foreground transition-colors">
              Login
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 px-6 bg-gradient-to-b from-background to-muted/20">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl lg:text-6xl font-light text-foreground mb-6">
            Creator <span className="text-accent">Resources</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8 leading-relaxed">
            Everything you need to succeed as a faceless content creator. From getting started to advanced monetization
            strategies.
          </p>

          {/* Search Bar */}
          <div className="max-w-md mx-auto relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <input
              type="text"
              placeholder="Search articles..."
              className="w-full pl-10 pr-4 py-3 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
            />
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-8 px-6 border-b border-border">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap gap-2 justify-center">
            {categories.map((category) => (
              <Button
                key={category}
                variant={category === "All" ? "default" : "outline"}
                size="sm"
                className="rounded-full"
              >
                {category}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* Blog Posts Grid */}
      <section className="py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogPosts.map((post) => (
              <Card key={post.id} className="group hover:shadow-lg transition-all duration-300 border-border">
                <div className="aspect-video overflow-hidden rounded-t-lg">
                  <img
                    src={post.image || "/placeholder.svg"}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>

                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="secondary" className="text-xs">
                      {post.category}
                    </Badge>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Clock className="w-3 h-3 mr-1" />
                      {post.readTime}
                    </div>
                  </div>

                  <CardTitle className="text-xl font-light group-hover:text-accent transition-colors">
                    {post.title}
                  </CardTitle>
                </CardHeader>

                <CardContent className="pt-0">
                  <CardDescription className="text-muted-foreground mb-4 leading-relaxed">
                    {post.excerpt}
                  </CardDescription>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3 mr-1" />
                      {new Date(post.publishDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>

                    <Link
                      href={`/blog/${post.slug}`}
                      className="inline-flex items-center text-sm text-accent hover:text-accent/80 transition-colors group"
                    >
                      Read more
                      <ArrowRight className="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-16 px-6 bg-muted/20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-light text-foreground mb-4">Stay Updated</h2>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            Get the latest tips, strategies, and insights delivered to your inbox. Join thousands of creators who are
            already ahead of the game.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
            />
            <Button className="px-8 py-3 bg-accent text-accent-foreground hover:bg-accent/90">Subscribe</Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card py-12 px-6 border-t border-border">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="text-foreground font-light text-2xl mb-4">
                Mass<span className="text-accent">Clip</span>
              </div>
              <p className="text-muted-foreground leading-relaxed max-w-md">
                Empowering faceless creators to monetize their content and build sustainable businesses through our
                innovative platform.
              </p>
            </div>

            <div>
              <h3 className="text-foreground font-medium mb-4">Quick Links</h3>
              <div className="space-y-2">
                <Link href="/" className="block text-muted-foreground hover:text-foreground transition-colors">
                  Home
                </Link>
                <Link href="/blog" className="block text-muted-foreground hover:text-foreground transition-colors">
                  Blog
                </Link>
                <Link href="/about" className="block text-muted-foreground hover:text-foreground transition-colors">
                  About
                </Link>
                <Link
                  href="/dashboard/explore"
                  className="block text-muted-foreground hover:text-foreground transition-colors"
                >
                  Explore
                </Link>
              </div>
            </div>

            <div>
              <h3 className="text-foreground font-medium mb-4">Support</h3>
              <div className="space-y-2">
                <a
                  href="mailto:contact@massclip.pro"
                  className="block text-muted-foreground hover:text-foreground transition-colors"
                >
                  Contact Us
                </a>
                <Link href="/terms" className="block text-muted-foreground hover:text-foreground transition-colors">
                  Terms of Service
                </Link>
                <Link href="/privacy" className="block text-muted-foreground hover:text-foreground transition-colors">
                  Privacy Policy
                </Link>
              </div>
            </div>
          </div>

          <div className="border-t border-border mt-8 pt-8 text-center text-muted-foreground">
            © 2025 MassClip. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}

export default BlogPage
