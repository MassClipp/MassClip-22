import Link from "next/link"
import { Button } from "@/components/ui/button"
import { UserX } from "lucide-react"

export default function CreatorNotFound() {
  return (
    <div className="container mx-auto px-4 py-16 flex flex-col items-center justify-center min-h-[70vh] text-center">
      <div className="bg-zinc-900/60 backdrop-blur-sm rounded-xl border border-zinc-800 p-8 max-w-md w-full">
        <UserX className="w-16 h-16 mx-auto mb-6 text-red-500" />
        <h1 className="text-3xl font-bold mb-4">Creator Not Found</h1>
        <p className="text-zinc-400 mb-8">
          The creator profile you're looking for doesn't exist or may have been removed.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild variant="outline">
            <Link href="/">Go Home</Link>
          </Button>
          <Button asChild>
            <Link href="/signup">Create Your Profile</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
