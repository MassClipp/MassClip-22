"use client"

import type { ReactNode } from "react"
import { ChevronRight } from "lucide-react"

interface CategorySectionProps {
  title: string
  children?: ReactNode
  isEmpty?: boolean
}

export default function CategorySection({ title, children, isEmpty = false }: CategorySectionProps) {
  return (
    <section className="mb-5">
      <div className="px-4 mb-1 flex items-center justify-between">
        <h2 className="text-base font-bold text-white">{title}</h2>
        {!isEmpty && (
          <button className="text-gray-400 hover:text-white flex items-center text-xs">
            See all <ChevronRight className="h-3 w-3 ml-1" />
          </button>
        )}
      </div>

      {isEmpty ? (
        <div className="px-4 h-[80px] flex items-center justify-center">
          <p className="text-gray-600 text-xs">Content coming soon</p>
        </div>
      ) : (
        <div className="relative">
          <div className="flex overflow-x-auto scrollbar-hide gap-2 px-4 pb-1">{children}</div>
        </div>
      )}
    </section>
  )
}
