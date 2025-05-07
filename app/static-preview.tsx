"use client"

export default function StaticPreview() {
  return (
    <div
      style={{
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "2rem",
      }}
    >
      <h1 style={{ fontSize: "2rem", fontWeight: "bold", marginBottom: "1.5rem", textAlign: "center" }}>
        MassClip Static Preview
      </h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: "1.5rem",
        }}
      >
        <div
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: "0.5rem",
            overflow: "hidden",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
          }}
        >
          <div style={{ padding: "1.5rem" }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "0.5rem" }}>Welcome to MassClip</h2>
            <p style={{ color: "#64748b", marginBottom: "1rem" }}>This is a simplified static preview</p>
            <p>This is a special version of the app that works in the v0.dev preview environment.</p>
            <p style={{ marginTop: "0.5rem" }}>
              The full version includes functionality that isn't compatible with v0.dev preview.
            </p>
          </div>
          <div style={{ padding: "1rem", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end" }}>
            <button
              style={{
                backgroundColor: "#3b82f6",
                color: "white",
                padding: "0.5rem 1rem",
                borderRadius: "0.25rem",
                border: "none",
                cursor: "pointer",
              }}
            >
              Example Button
            </button>
          </div>
        </div>

        <div
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: "0.5rem",
            overflow: "hidden",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
          }}
        >
          <div style={{ padding: "1.5rem" }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "0.5rem" }}>Features</h2>
            <p style={{ color: "#64748b", marginBottom: "1rem" }}>What MassClip offers</p>
            <ul style={{ paddingLeft: "1.5rem", listStyleType: "disc" }}>
              <li style={{ marginBottom: "0.5rem" }}>Video content management</li>
              <li style={{ marginBottom: "0.5rem" }}>User authentication</li>
              <li style={{ marginBottom: "0.5rem" }}>Content categorization</li>
              <li style={{ marginBottom: "0.5rem" }}>Download capabilities</li>
              <li>Subscription management</li>
            </ul>
          </div>
          <div style={{ padding: "1rem", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end" }}>
            <button
              style={{
                backgroundColor: "transparent",
                color: "#3b82f6",
                padding: "0.5rem 1rem",
                borderRadius: "0.25rem",
                border: "1px solid #3b82f6",
                cursor: "pointer",
              }}
            >
              Learn More
            </button>
          </div>
        </div>

        <div
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: "0.5rem",
            overflow: "hidden",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
          }}
        >
          <div style={{ padding: "1.5rem" }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "0.5rem" }}>Getting Started</h2>
            <p style={{ color: "#64748b", marginBottom: "1rem" }}>How to use MassClip</p>
            <p>MassClip provides an easy way to manage and access video content.</p>
            <p style={{ marginTop: "0.5rem" }}>Sign up, browse categories, and start exploring content right away.</p>
          </div>
          <div style={{ padding: "1rem", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end" }}>
            <button
              style={{
                backgroundColor: "#f3f4f6",
                color: "#1f2937",
                padding: "0.5rem 1rem",
                borderRadius: "0.25rem",
                border: "none",
                cursor: "pointer",
              }}
            >
              Get Started
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
