import ClipItem from "@/components/clip-item"
import type { Clip } from "@/hooks/use-clips"

interface ClipsByCategoryProps {
  clipsByCategory: Record<string, Clip[]>
  showTags?: boolean
}

export default function ClipsByCategory({ clipsByCategory, showTags = true }: ClipsByCategoryProps) {
  return (
    <div className="space-y-12">
      {Object.entries(clipsByCategory).map(([category, clips]) => (
        <div key={category}>
          <h2 className="text-2xl font-bold mb-4 pb-2 border-b">{category}</h2>
          <div className="space-y-8">
            {clips.map((clip) => (
              <ClipItem key={clip.id} clip={clip} showTags={showTags} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
