import DownloadMethodTester from "@/components/download-method-tester"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Download Method Testing | MassClip",
  description: "Test different download methods to find the most reliable one for your environment",
}

export default function DownloadMethodsPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6 text-white">Download Method Testing</h1>
      <p className="text-gray-300 mb-6">
        This page allows you to test different download methods to determine which one works best in your browser and
        environment. After running the tests, check your downloads folder to see which methods successfully downloaded
        the file.
      </p>
      <DownloadMethodTester />
    </div>
  )
}
