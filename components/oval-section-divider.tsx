import Link from "next/link"
import { ArrowRight } from "lucide-react"

interface OvalSectionDividerProps {
  title: string
  viewAllLink?: string
  className?: string
}

export default function OvalSectionDivider({ title, viewAllLink, className = "" }: OvalSectionDividerProps) {
  return (
    <div className={`relative w-full my-12 ${className}`}>
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-zinc-800"></div>
      </div>
      <div className="relative flex justify-between items-center">
        <div className="bg-black px-4 text-2xl font-light text-white">{title}</div>
        {viewAllLink && (
          <Link
            href={viewAllLink}
            className="bg-black px-4 flex items-center text-sm text-zinc-400 hover:text-white transition-colors"
          >
            View All <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        )}
      </div>
    </div>
  )
}
