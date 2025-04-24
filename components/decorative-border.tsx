interface DecorativeBorderProps {
  className?: string
}

export default function DecorativeBorder({ className = "" }: DecorativeBorderProps) {
  return (
    <div className={`w-full flex justify-center py-2 ${className}`}>
      <div className="relative w-full max-w-md px-4">
        <div className="flex items-center justify-center">
          <div className="h-[0.5px] w-1/3 bg-gradient-to-r from-transparent to-maroon" />
          <div className="mx-2 h-0.5 w-0.5 rounded-full bg-maroon" />
          <div className="h-[0.5px] w-1/3 bg-gradient-to-l from-transparent to-maroon" />
        </div>
        <div
          className="mt-0.5 h-[0.5px]"
          style={{
            borderRadius: "50%",
            height: "0.5px",
            background: "linear-gradient(to right, transparent, #800020, transparent)",
            boxShadow: "0 0 1px rgba(128, 0, 32, 0.2)",
          }}
        />
      </div>
    </div>
  )
}
