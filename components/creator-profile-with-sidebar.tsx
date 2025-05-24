import type React from "react"
import type { Creator } from "@/types"
import VideoGrid from "./video-grid"
import PremiumContentCTA from "./premium-content-cta"

interface CreatorProfileWithSidebarProps {
  creator: Creator
}

const CreatorProfileWithSidebar: React.FC<CreatorProfileWithSidebarProps> = ({ creator }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {/* Main Content */}
      <div className="md:col-span-3">
        {/* Creator Profile */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-white mb-4">{creator.name}</h2>
          {/* Creator bio */}
          <div className="mb-6">
            <p className="text-zinc-300">{creator.bio || "No bio available"}</p>
          </div>

          {/* Premium Content CTA */}
          <PremiumContentCTA creator={creator} />

          {/* Video grid */}
          <VideoGrid creatorId={creator.id} />
        </div>
      </div>

      {/* Sidebar (Optional) */}
      <div className="md:col-span-1">
        {/* Add sidebar content here */}
        <div className="bg-zinc-900 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-2">Sidebar</h3>
          <p className="text-zinc-300">This is a placeholder for sidebar content.</p>
        </div>
      </div>
    </div>
  )
}

export default CreatorProfileWithSidebar
