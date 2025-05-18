import Link from "next/link"
import { Button } from "@/components/ui/button"
import Logo from "@/components/logo"

export default function CreatorNotFound() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4">
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-black via-black to-gray-900"></div>

      <Logo href="/" size="md" linkClassName="absolute top-8 left-8 z-10" />

      <div className="max-w-md w-full p-8 bg-black/60 backdrop-blur-sm rounded-xl border border-gray-800 shadow-2xl relative z-10 text-center">
        <h1 className="text-3xl font-bold text-white mb-4">Creator Not Found</h1>
        <p className="text-gray-400 mb-8">
          The creator profile you're looking for doesn't exist or may have been removed.
        </p>

        <div className="flex flex-col space-y-4">
          <Button asChild className="bg-red-600 hover:bg-red-700">
            <Link href="/">Return Home</Link>
          </Button>

          <Button asChild variant="outline" className="border-gray-700 text-white hover:bg-gray-800">
            <Link href="/signup">Create Your Profile</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
