interface ClipPlayerProps {
  src: string
}

export default function ClipPlayer({ src }: ClipPlayerProps) {
  return (
    <div style={{ maxWidth: "720px", margin: "0 auto", padding: "1rem" }}>
      <video
        controls
        width="100%"
        height="auto"
        preload="metadata"
        style={{ borderRadius: "12px", backgroundColor: "#000" }}
      >
        <source src={src} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </div>
  )
}
