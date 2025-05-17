export default function PurchasedClipsLoading() {
  return (
    <div className="min-h-screen bg-black p-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="h-8 bg-gray-800 rounded w-48 animate-pulse"></div>
            <div className="h-4 bg-gray-800 rounded w-64 mt-2 animate-pulse"></div>
          </div>

          <div className="w-full md:w-64 h-10 bg-gray-800 rounded animate-pulse"></div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-[9/16] bg-gray-800 rounded-lg"></div>
              <div className="h-4 bg-gray-800 rounded mt-2 w-3/4"></div>
              <div className="h-3 bg-gray-800 rounded mt-2 w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
