import ClipPlayer from "@/components/ClipPlayer"
import type { Clip } from "@/hooks/use-clips"

interface ClipItemProps {
  clip: Clip
  showTags?: boolean
}

export default function ClipItem({ clip, showTags = true }: ClipItemProps) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
      <div className="p-4">
        <h3 className="text-xl font-semibold mb-1">{clip.title}</h3>
        {clip.category && <p className="text-sm text-gray-600 mb-2">Category: {clip.category}</p>}
        {showTags && clip.tags && clip.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {clip.tags.map((tag) => (
              <span key={tag} className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full">
                {tag}
              </span>
            ))}
          </div>
        )}
        {clip.description && <p className="text-gray-700 mb-4">{clip.description}</p>}
      </div>

      <div className="px-4 pb-4">
        <ClipPlayer src={clip.url} />
      </div>
    </div>
  )
}
