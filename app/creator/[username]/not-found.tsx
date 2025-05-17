import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function CreatorNotFound() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold text-white mb-4">Creator Not Found</h1>
      <p className="text-gray-400 text-center max-w-md mb-8">
        The creator profile you're looking for doesn't exist or may have been removed.
      </p>
      <div className="flex gap-4">
        <Button asChild variant="outline" className="border-gray-700 text-white hover:bg-gray-800">
          <Link href="/">Go Home</Link>
        </Button>
        <Button asChild className="bg-crimson hover:bg-crimson/90 text-white">
          <Link href="/dashboard/creator/setup">Create Your Profile</Link>
        </Button>
      </div>
    </div>
  )
}
