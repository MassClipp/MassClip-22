import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Home, Search } from "lucide-react"

export default function CreatorNotFound() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-bold mb-4">Creator Not Found</h1>
        <p className="text-gray-400 mb-8">
          The creator profile you're looking for doesn't exist or may have been removed.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild variant="outline" className="flex items-center gap-2">
            <Link href="/">
              <Home className="h-4 w-4" />
              Go Home
            </Link>
          </Button>
          <Button asChild className="bg-red-600 hover:bg-red-700 flex items-center gap-2">
            <Link href="/category/browse-all">
              <Search className="h-4 w-4" />
              Browse Clips
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
