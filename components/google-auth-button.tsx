"use client"

import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { FcGoogle } from "react-icons/fc"

interface GoogleAuthButtonProps {
  onClick: () => void
  isLoading: boolean
  text: string
  disabled?: boolean
}

export function GoogleAuthButton({ onClick, isLoading, text, disabled = false }: GoogleAuthButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      disabled={isLoading || disabled}
      className="w-full bg-white hover:bg-gray-100 text-gray-900 flex items-center justify-center gap-2"
    >
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FcGoogle className="h-5 w-5" />}
      {isLoading ? "Signing in..." : text}
    </Button>
  )
}
