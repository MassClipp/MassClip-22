import { Loader2 } from "lucide-react"

export default function UploadLoading() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center">
      <Loader2 className="h-12 w-12 text-red-500 animate-spin mb-4" />
      <h2 className="text-xl font-medium">Loading Upload Studio...</h2>
      <p className="text-zinc-400 mt-2">Preparing your creator tools</p>
    </div>
  )
}
