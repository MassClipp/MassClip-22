import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Home, Search } from "lucide-react"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-zinc-900 mb-6">
          <Search className="h-8 w-8 text-zinc-400" />
        </div>
        <h1 className="text-3xl font-bold mb-4">Creator Not Found</h1>
        <p className="text-zinc-400 mb-8">
          The creator profile you're looking for doesn't exist or may have been removed.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild>
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Return Home
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/category/browse-all">Browse Categories</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
