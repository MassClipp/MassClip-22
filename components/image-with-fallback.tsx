"use client"

import type React from "react"

import { useState } from "react"
import Image from "next/image"
import { Video } from "lucide-react"

interface ImageWithFallbackProps {
  src: string
  alt: string
  fill?: boolean
  width?: number
  height?: number
  className?: string
  fallbackIcon?: React.ReactNode
  sizes?: string
}

export default function ImageWithFallback({
  src,
  alt,
  fill = false,
  width,
  height,
  className = "",
  fallbackIcon = <Video className="h-12 w-12 text-zinc-600" />,
  sizes,
}: ImageWithFallbackProps) {
  const [error, setError] = useState(false)

  if (error || !src) {
    return <div className={`flex items-center justify-center bg-zinc-800 ${className}`}>{fallbackIcon}</div>
  }

  return (
    <Image
      src={src || "/placeholder.svg"}
      alt={alt}
      fill={fill}
      width={width}
      height={height}
      className={className}
      onError={() => setError(true)}
      sizes={sizes}
      priority={true}
    />
  )
}
