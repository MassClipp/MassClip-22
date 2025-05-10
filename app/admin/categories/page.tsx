/**
 * Admin page for managing categories
 */

"use client"

import { useState, useEffect } from "react"
import { useCategoriesWithCounts } from "@/hooks/use-categories"
import {
  migrateFromOldCategoryAssignments,
  migrateFromShowcases,
  migrateFromUploads,
} from "@/lib/category-system/migration"
import { ensureCategorySystem } from "@/lib/category-system/category-service"
import { useToast } from "@/hooks/use-toast"

export default function CategoriesAdminPage() {
  const { categories, loading, error } = useCategoriesWithCounts()
  const [isMigrating, setIsMigrating] = useState(false)
  const [migrationResults, setMigrationResults] = useState<any>(null)
  const { toast } = useToast()

  // Initialize the category system on page load
  useEffect(() => {
    async function init() {
      try {
        await ensureCategorySystem()
      } catch (err) {
        console.error("Error initializing category system:", err)
        toast({
          title: "Initialization Error",
          description: "Failed to initialize the category system.",
          variant: "destructive",
        })
      }
    }

    init()
  }, [toast])

  // Handle migration from old category assignments
  const handleMigrateFromOldAssignments = async () => {
    setIsMigrating(true)

    try {
      const results = await migrateFromOldCategoryAssignments(100)
      setMigrationResults(results)

      toast({
        title: "Migration Complete",
        description: `Processed ${results.processed} assignments, migrated ${results.migrated}.`,
      })
    } catch (err) {
      console.error("Error during migration:", err)

      toast({
        title: "Migration Error",
        description: "An error occurred during migration.",
        variant: "destructive",
      })
    } finally {
      setIsMigrating(false)
    }
  }

  // Handle migration from showcases
  const handleMigrateFromShowcases = async () => {
    setIsMigrating(true)

    try {
      // Get showcase IDs from the mapping
      const showcaseIds = Object.keys(require("@/lib/category-system/constants").SHOWCASE_TO_CATEGORY_MAP)

      const results = await migrateFromShowcases(showcaseIds)
      setMigrationResults(results)

      toast({
        title: "Showcase Migration Complete",
        description: `Migrated ${results.migrated} videos from showcases.`,
      })
    } catch (err) {
      console.error("Error during showcase migration:", err)

      toast({
        title: "Migration Error",
        description: "An error occurred during showcase migration.",
        variant: "destructive",
      })
    } finally {
      setIsMigrating(false)
    }
  }

  // Handle migration from uploads
  const handleMigrateFromUploads = async () => {
    setIsMigrating(true)

    try {
      const results = await migrateFromUploads(100)
      setMigrationResults(results)

      toast({
        title: "Uploads Migration Complete",
        description: `Processed ${results.processed} uploads, migrated ${results.migrated}.`,
      })
    } catch (err) {
      console.error("Error during uploads migration:", err)

      toast({
        title: "Migration Error",
        description: "An error occurred during uploads migration.",
        variant: "destructive",
      })
    } finally {
      setIsMigrating(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Category Management</h1>

      {/* Migration Tools */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Migration Tools</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <button
            onClick={handleMigrateFromOldAssignments}
            disabled={isMigrating}
            className="bg-zinc-800 hover:bg-zinc-700 text-white py-2 px-4 rounded-lg disabled:opacity-50"
          >
            {isMigrating ? "Migrating..." : "Migrate from Old Assignments"}
          </button>

          <button
            onClick={handleMigrateFromShowcases}
            disabled={isMigrating}
            className="bg-zinc-800 hover:bg-zinc-700 text-white py-2 px-4 rounded-lg disabled:opacity-50"
          >
            {isMigrating ? "Migrating..." : "Migrate from Showcases"}
          </button>

          <button
            onClick={handleMigrateFromUploads}
            disabled={isMigrating}
            className="bg-zinc-800 hover:bg-zinc-700 text-white py-2 px-4 rounded-lg disabled:opacity-50"
          >
            {isMigrating ? "Migrating..." : "Migrate from Uploads"}
          </button>
        </div>

        {migrationResults && (
          <div className="bg-zinc-800/50 p-4 rounded-lg">
            <h3 className="text-lg font-medium mb-2">Migration Results</h3>
            <pre className="text-xs overflow-auto p-2 bg-black/30 rounded">
              {JSON.stringify(migrationResults, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Categories List */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-4">Categories</h2>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-crimson mx-auto"></div>
            <p className="mt-2 text-zinc-400">Loading categories...</p>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-500/10 rounded-lg text-red-500">Error loading categories: {error.message}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-3 px-4">ID</th>
                  <th className="text-left py-3 px-4">Name</th>
                  <th className="text-left py-3 px-4">Slug</th>
                  <th className="text-center py-3 px-4">Videos</th>
                  <th className="text-center py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20">
                    <td className="py-3 px-4 font-mono text-xs">{category.id}</td>
                    <td className="py-3 px-4">{category.name}</td>
                    <td className="py-3 px-4 text-zinc-400">{category.slug}</td>
                    <td className="py-3 px-4 text-center">{category.videoCount}</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-1 rounded-full text-xs ${
                          category.isActive ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {category.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}

                {categories.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-zinc-500">
                      No categories found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
