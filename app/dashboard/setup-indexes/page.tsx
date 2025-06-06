import { FirestoreIndexSetup } from "@/components/firestore-index-setup"

export default function SetupIndexesPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Database Setup</h1>
          <p className="text-gray-600 mt-2">Set up required Firestore indexes for optimal performance</p>
        </div>

        <FirestoreIndexSetup />
      </div>
    </div>
  )
}
