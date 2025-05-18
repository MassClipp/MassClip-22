import Link from "next/link"

export default function CreatorNotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4">
      <h1 className="text-4xl font-bold text-gray-800 mb-4">Creator Not Found</h1>
      <p className="text-xl text-gray-600 mb-8 text-center max-w-md">
        The creator profile you're looking for doesn't exist or has been removed.
      </p>
      <div className="flex gap-4">
        <Link href="/" className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition">
          Go Home
        </Link>
        <Link
          href="/category/browse-all"
          className="bg-gray-200 text-gray-800 px-6 py-3 rounded-md hover:bg-gray-300 transition"
        >
          Browse Content
        </Link>
      </div>
    </div>
  )
}
