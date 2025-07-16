"use client"

import { useSearchParams } from "next/navigation"

export default function PurchaseSuccessDebug() {
  const searchParams = useSearchParams()

  const productBoxId = searchParams.get("product_box_id")
  const userId = searchParams.get("user_id")
  const creatorId = searchParams.get("creator_id")

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold mb-4 text-green-600">🎉 Purchase Success Debug Page</h1>
        <p className="text-gray-600 mb-6">This page is working! The route exists.</p>

        <div className="space-y-4">
          <div>
            <h3 className="font-semibold">URL Parameters:</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>
                <strong>Product Box ID:</strong> {productBoxId || "Not found"}
              </li>
              <li>
                <strong>User ID:</strong> {userId || "Not found"}
              </li>
              <li>
                <strong>Creator ID:</strong> {creatorId || "Not found"}
              </li>
            </ul>
          </div>

          <div className="p-4 bg-green-50 rounded-lg">
            <h3 className="font-semibold text-green-800 mb-2">✅ Route Status</h3>
            <p className="text-green-700 text-sm">
              The /purchase-success route is working correctly. If you can see this page, the routing is not the issue.
            </p>
          </div>

          <div className="p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-2">🔍 Next Steps</h3>
            <p className="text-blue-700 text-sm">
              Try accessing /purchase-success with your original URL parameters. If that still shows 404, there might be
              a caching or deployment issue.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
