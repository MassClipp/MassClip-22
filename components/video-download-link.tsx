"use client"

interface VideoDownloadLinkProps {
  src: string
  title?: string
}

export default function VideoDownloadLink({ src, title }: VideoDownloadLinkProps) {
  return (
    <div className="bg-zinc-900/30 backdrop-blur-sm border border-zinc-800/50 rounded-xl p-6 shadow-xl text-center">
      <h2 className="text-xl font-medium text-white mb-4">{title || "Video Format Not Supported"}</h2>
      <p className="text-zinc-400 mb-6">
        Your browser doesn't support this video format. You can download the video to watch it with a compatible player.
      </p>
      <a
        href={src}
        download
        className="px-6 py-3 bg-crimson text-white rounded-lg hover:bg-crimson-dark transition-colors inline-block"
      >
        Download Video
      </a>
    </div>
  )
}
