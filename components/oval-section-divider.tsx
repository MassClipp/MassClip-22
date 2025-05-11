import Link from "next/link"
import { ChevronRight } from "lucide-react"

interface OvalSectionDividerProps {
  title: string
  viewAllLink?: string
  className?: string
}

export default function OvalSectionDivider({ title, viewAllLink, className = "" }: OvalSectionDividerProps) {
  return (
    <div className={`relative w-full my-8 ${className}`}>
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-light text-white">{title}</h2>
        {viewAllLink && (
          <Link
            href={viewAllLink}
            className="flex items-center text-xs text-zinc-400 hover:text-white transition-colors"
          >
            See all <ChevronRight className="ml-1 h-3 w-3" />
          </Link>
        )}
      </div>
    </div>
  )
}
