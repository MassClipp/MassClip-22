"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"

interface LogoProps {
  className?: string
  href?: string
  linkClassName?: string
  size?: "sm" | "md" | "lg"
}

/**
 * Logo component for MassClip
 * Displays the MassClip logo with customizable size and styling
 * Can be rendered as a link when href is provided
 *
 * @param className - Additional classes for the logo container
 * @param href - Optional URL to make the logo a link
 * @param linkClassName - Additional classes for the link wrapper (when href is provided)
 * @param size - Size variant of the logo: "sm", "md", or "lg"
 */
export default function Logo({ className, href, linkClassName, size = "md" }: LogoProps) {
  const content = (
    <div className={cn("flex flex-col items-center", className)}>
      <div className="flex items-center">
        <span
          className={cn(
            "font-light tracking-tight",
            size === "sm" && "text-xl",
            size === "md" && "text-2xl",
            size === "lg" && "text-3xl md:text-4xl",
          )}
        >
          <span className="text-crimson font-normal">Mass</span>
          <span className="text-white">Clip</span>
          <span className="text-crimson text-xs align-super ml-0.5">™</span>
        </span>
      </div>
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
