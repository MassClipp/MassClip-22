import Link from "next/link"
import { Button } from "@/components/ui/button"
import { UserX, Home, Search } from "lucide-react"

export default function CreatorNotFound() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-4">
      <div className="max-w-md text-center">
        <UserX className="h-24 w-24 text-red-500 mx-auto mb-6" />
        <h1 className="text-3xl font-bold mb-4">Creator Not Found</h1>
        <p className="text-gray-400 mb-8">
          The creator profile you're looking for doesn't exist or may have been removed.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild className="bg-red-600 hover:bg-red-700">
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Link>
          </Button>
          <Button asChild variant="outline" className="border-gray-700 hover:bg-gray-800">
            <Link href="/category/browse-all">
              <Search className="mr-2 h-4 w-4" />
              Browse Creators
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
