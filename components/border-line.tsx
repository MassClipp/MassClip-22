interface BorderLineProps {
  className?: string
}

export default function BorderLine({ className = "" }: BorderLineProps) {
  return (
    <div className={`w-full flex justify-center py-1 ${className}`}>
      <div className="relative w-full max-w-3xl px-4">
        <div
          className="h-[0.5px] bg-gradient-to-r from-transparent via-maroon to-transparent"
          style={{
            borderRadius: "100%",
            height: "0.5px",
            background: "linear-gradient(to right, transparent, #800020, transparent)",
            boxShadow: "0 0 1px rgba(128, 0, 32, 0.2)",
          }}
        />
      </div>
    </div>
  )
}
