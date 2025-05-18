import Link from "next/link"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <h1 className="text-3xl font-bold mb-4">Creator Not Found</h1>
      <p className="text-gray-600 mb-8 text-center">
        The creator profile you're looking for doesn't exist or may have been removed.
      </p>
      <Link href="/" className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700">
        Go Home
      </Link>
    </div>
  )
}
