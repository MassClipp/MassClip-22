import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Home, Search } from "lucide-react"

export default function CreatorNotFound() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="space-y-6 max-w-md">
        <h1 className="text-4xl font-bold">Creator Not Found</h1>
        <p className="text-zinc-400 text-lg">
          The creator profile you're looking for doesn't exist or may have been removed.
        </p>
        <div className="flex flex-wrap gap-4 justify-center pt-4">
          <Button asChild>
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/creators">
              <Search className="mr-2 h-4 w-4" />
              Browse Creators
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
