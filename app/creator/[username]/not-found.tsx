import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function CreatorNotFound() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-bold text-white mb-4">Creator Not Found</h1>
      <p className="text-gray-400 text-center max-w-md mb-8">
        The creator profile you're looking for doesn't exist or may have been removed.
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <Button asChild>
          <Link href="/dashboard">Go to Dashboard</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/explore">Explore Creators</Link>
        </Button>
      </div>
    </div>
  )
}
