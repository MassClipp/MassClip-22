"use client"

import Link from "next/link"
import { Flame, Activity } from "lucide-react"

const categories = [
  {
    slug: "mindset",
    label: "Mindset",
    icon: Flame,
  },
  {
    slug: "hustle",
    label: "Hustle",
    icon: Activity,
  },
  // 🛑  TEMPORARY: Cinema & Recent removed
]

export default function TrendingCategoriesSection() {
  return (
    <section className="mt-6">
      <h2 className="text-xl font-semibold mb-4">Trending&nbsp;Categories</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {categories.map(({ slug, label, icon: Icon }) => (
          <Link
            key={slug}
            href={`/category/${slug}`}
            className="border rounded-lg p-4 flex items-center gap-3 hover:bg-muted transition"
          >
            <Icon size={20} />
            <span>{label}</span>
          </Link>
        ))}
      </div>
    </section>
  )
}
