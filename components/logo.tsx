import Link from "next/link"
import { cn } from "@/lib/utils"

interface LogoProps {
  className?: string
  href?: string
  linkClassName?: string
  size?: "sm" | "md" | "lg"
  showBeta?: boolean
}

export default function Logo({ className, href, linkClassName, size = "md", showBeta = true }: LogoProps) {
  const content = (
    <div className={cn("flex flex-col items-center", className)}>
      <div className="flex items-center">
        <span
          className={cn(
            "font-bold tracking-tighter",
            size === "sm" && "text-xl",
            size === "md" && "text-2xl",
            size === "lg" && "text-3xl md:text-4xl",
          )}
        >
          <span className="text-crimson">Mass</span>
          <span className="text-white">Clip</span>
          <span className="text-crimson text-xs align-super ml-0.5">™</span>
        </span>
      </div>
      {showBeta && (
        <span className="text-xs bg-yellow-600 text-white px-1.5 py-0.5 rounded-sm mt-1 font-medium">BETA</span>
      )}
    </div>
  )

  if (href) {
    return (
      <Link href={href} className={linkClassName}>
        {content}
      </Link>
    )
  }

  return content
}
