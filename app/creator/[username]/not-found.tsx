import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Home } from "lucide-react"

export default function CreatorNotFound() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4">
      <h1 className="text-4xl font-bold text-white mb-4">Creator Not Found</h1>
      <p className="text-gray-400 text-center max-w-md mb-8">
        The creator profile you're looking for doesn't exist or may have been removed.
      </p>
      <Button asChild className="bg-red-600 hover:bg-red-700">
        <Link href="/">
          <Home className="mr-2 h-4 w-4" />
          Back to Home
        </Link>
      </Button>
    </div>
  )
}
