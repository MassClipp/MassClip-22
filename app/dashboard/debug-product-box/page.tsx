import ProductBoxDebugForm from "@/components/product-box-debug-form"

export default function DebugProductBoxPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Product Box Creation Debug</h1>
          <p className="text-gray-600">
            Use this page to debug product box creation issues and identify where the process fails.
          </p>
        </div>

        <ProductBoxDebugForm />
      </div>
    </div>
  )
}
