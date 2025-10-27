import type { ReactNode } from "react"

interface FullscreenWrapperProps {
  children: ReactNode
  className?: string
}

export function FullscreenWrapper({ children, className = "" }: FullscreenWrapperProps) {
  return <div className={`min-h-screen w-full m-0 p-0 ${className}`}>{children}</div>
}
