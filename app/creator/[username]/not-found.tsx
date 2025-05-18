import Link from "next/link"
import { Button } from "@/components/ui/button"
import { UserX } from "lucide-react"

export default function CreatorNotFound() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4 text-center">
      <UserX className="h-24 w-24 text-red-500 mb-6" />
      <h1 className="text-3xl font-bold text-white mb-2">Creator Not Found</h1>
      <p className="text-gray-400 max-w-md mb-8">
        The creator profile you're looking for doesn't exist or may have been removed.
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <Button asChild variant="outline" className="border-gray-700 text-white hover:bg-gray-800">
          <Link href="/">Go Home</Link>
        </Button>
        <Button asChild className="bg-red-600 hover:bg-red-700">
          <Link href="/signup">Create Your Profile</Link>
        </Button>
      </div>
    </div>
  )
}
