import Link from "next/link"
import { Button } from "@/components/ui/button"
import { UserX } from "lucide-react"

export default function CreatorNotFound() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-4">
      <UserX className="h-24 w-24 text-gray-600 mb-6" />
      <h1 className="text-3xl md:text-4xl font-bold mb-4">Creator Not Found</h1>
      <p className="text-gray-400 text-center max-w-md mb-8">
        The creator profile you're looking for doesn't exist or may have been removed.
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <Button asChild>
          <Link href="/dashboard">Go to Dashboard</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/dashboard/creator-hub">Create Your Profile</Link>
        </Button>
      </div>
    </div>
  )
}
