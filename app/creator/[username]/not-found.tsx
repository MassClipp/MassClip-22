import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function CreatorNotFound() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center max-w-md px-4">
        <h1 className="text-3xl font-bold text-white mb-4">Creator Not Found</h1>
        <p className="text-gray-400 mb-8">
          The creator profile you're looking for doesn't exist or may have been removed.
        </p>
        <Button asChild>
          <Link href="/">Return Home</Link>
        </Button>
      </div>
    </div>
  )
}
