import Link from "next/link"

export default function CreatorNotFound() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-bold mb-4">Creator Not Found</h1>
      <p className="text-gray-400 text-center mb-8">
        The creator profile you're looking for doesn't exist or may have been removed.
      </p>
      <Link href="/" className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-full transition-colors">
        Back to Home
      </Link>
    </div>
  )
}
