export default function UploadLoading() {
  return (
    <div className="min-h-screen bg-black py-12">
      <div className="max-w-2xl mx-auto p-6">
        <div className="mb-6">
          <div className="h-8 w-64 bg-zinc-800 rounded-md animate-pulse mb-2"></div>
          <div className="h-5 w-48 bg-zinc-800 rounded-md animate-pulse"></div>
        </div>

        <div className="space-y-6">
          <div className="border-2 border-dashed border-zinc-700 rounded-lg p-12 flex flex-col items-center justify-center animate-pulse">
            <div className="h-10 w-10 bg-zinc-800 rounded-full mb-4"></div>
            <div className="h-5 w-48 bg-zinc-800 rounded-md mb-2"></div>
            <div className="h-4 w-36 bg-zinc-800 rounded-md mb-4"></div>
            <div className="h-9 w-28 bg-zinc-800 rounded-md"></div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="h-5 w-16 bg-zinc-800 rounded-md mb-2"></div>
              <div className="h-10 w-full bg-zinc-800 rounded-md"></div>
            </div>

            <div>
              <div className="h-5 w-24 bg-zinc-800 rounded-md mb-2"></div>
              <div className="h-24 w-full bg-zinc-800 rounded-md"></div>
            </div>
          </div>

          <div className="h-16 w-full bg-zinc-800 rounded-lg"></div>

          <div className="flex justify-end gap-3">
            <div className="h-10 w-20 bg-zinc-800 rounded-md"></div>
            <div className="h-10 w-32 bg-zinc-800 rounded-md"></div>
          </div>
        </div>
      </div>
    </div>
  )
}
