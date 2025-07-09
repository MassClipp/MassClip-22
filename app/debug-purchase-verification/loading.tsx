export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-2 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
        </div>

        <div className="space-y-6">
          <div className="h-12 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-96 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>
    </div>
  )
}
