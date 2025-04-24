import Link from "next/link"
import { cn } from "@/lib/utils"

interface LogoProps {
  className?: string
  href?: string
  linkClassName?: string
  size?: "sm" | "md" | "lg"
}

export default function Logo({ className, href, linkClassName, size = "md" }: LogoProps) {
  const content = (
    <div className={cn("flex items-center", className)}>
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
