import { Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface LockedClipCardProps {
  thumbnailUrl?: string
}

export default function LockedClipCard({ thumbnailUrl }: LockedClipCardProps) {
  return (
    <div className="flex-shrink-0 w-[160px]">
      <div
        className="relative"
        style={{
          position: "relative",
          paddingBottom: "177.78%", // 9:16 aspect ratio
          height: 0,
          borderRadius: "8px",
          overflow: "hidden",
        }}
      >
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: thumbnailUrl ? `url(${thumbnailUrl})` : "none",
            backgroundColor: thumbnailUrl ? "transparent" : "#111",
            filter: "blur(3px)",
          }}
        ></div>
        <div className="absolute inset-0 bg-black/60"></div>
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
          <Lock className="h-8 w-8 text-crimson mb-2" />
          <p className="text-white text-xs mb-3">Locked – Upgrade to Pro</p>
          <Link href="/pricing">
            <Button size="sm" className="bg-crimson hover:bg-crimson/80 text-white text-xs px-3 py-1 h-auto">
              Upgrade
            </Button>
          </Link>
        </div>
      </div>
      <div className="mt-2 text-xs text-zinc-400 min-h-[2.5rem] line-clamp-2">Premium Content</div>
    </div>
  )
}
