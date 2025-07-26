"use client"

import { useMemo } from "react"
import { Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Area, AreaChart, ReferenceLine } from "recharts"

interface ChartData {
  month: string
  revenue: number
  transactions: number
}

interface TechRevenueChartProps {
  data: ChartData[]
}

// Custom dot component for angular design
const AngularDot = (props: any) => {
  const { cx, cy, fill } = props
  return (
    <g>
      {/* Outer angular ring */}
      <polygon
        points={`${cx - 6},${cy} ${cx},${cy - 6} ${cx + 6},${cy} ${cx},${cy + 6}`}
        fill="none"
        stroke={fill}
        strokeWidth="2"
        opacity="0.8"
      />
      {/* Inner angular dot */}
      <polygon points={`${cx - 3},${cy} ${cx},${cy - 3} ${cx + 3},${cy} ${cx},${cy + 3}`} fill={fill} opacity="1" />
      {/* Glowing effect */}
      <circle cx={cx} cy={cy} r="8" fill={fill} opacity="0.1" />
    </g>
  )
}

// Custom grid component with angular lines
const AngularGrid = (props: any) => {
  const { x, y, width, height, horizontalPoints, verticalPoints } = props

  return (
    <g className="recharts-cartesian-grid">
      {/* Horizontal lines with angular breaks */}
      {horizontalPoints?.map((point: number, index: number) => (
        <g key={`h-${index}`}>
          <line x1={x} y1={point} x2={x + width * 0.3} y2={point} stroke="rgba(148, 163, 184, 0.1)" strokeWidth="1" />
          <line
            x1={x + width * 0.35}
            y1={point}
            x2={x + width * 0.65}
            y2={point}
            stroke="rgba(148, 163, 184, 0.1)"
            strokeWidth="1"
          />
          <line
            x1={x + width * 0.7}
            y1={point}
            x2={x + width}
            y2={point}
            stroke="rgba(148, 163, 184, 0.1)"
            strokeWidth="1"
          />
        </g>
      ))}
      {/* Vertical lines with angular breaks */}
      {verticalPoints?.map((point: number, index: number) => (
        <g key={`v-${index}`}>
          <line x1={point} y1={y} x2={point} y2={y + height * 0.3} stroke="rgba(148, 163, 184, 0.1)" strokeWidth="1" />
          <line
            x1={point}
            y1={y + height * 0.35}
            x2={point}
            y2={y + height * 0.65}
            stroke="rgba(148, 163, 184, 0.1)"
            strokeWidth="1"
          />
          <line
            x1={point}
            y1={y + height * 0.7}
            x2={point}
            y2={y + height}
            stroke="rgba(148, 163, 184, 0.1)"
            strokeWidth="1"
          />
        </g>
      ))}
    </g>
  )
}

export function TechRevenueChart({ data }: TechRevenueChartProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) {
      // Generate sample data for demonstration
      return [
        { month: "Jan", revenue: 0, transactions: 0, trend: 0 },
        { month: "Feb", revenue: 0, transactions: 0, trend: 0 },
        { month: "Mar", revenue: 0, transactions: 0, trend: 0 },
        { month: "Apr", revenue: 0, transactions: 0, trend: 0 },
        { month: "May", revenue: 0, transactions: 0, trend: 0 },
        { month: "Jun", revenue: 0, transactions: 0, trend: 0 },
      ]
    }

    // Add trend calculation for angular indicators
    return data.map((item, index) => {
      const prevRevenue = index > 0 ? data[index - 1].revenue : item.revenue
      const trend = item.revenue - prevRevenue
      return {
        ...item,
        trend,
      }
    })
  }, [data])

  const maxRevenue = Math.max(...chartData.map((d) => d.revenue))
  const hasData = maxRevenue > 0

  if (!hasData) {
    return (
      <div className="h-64 relative">
        {/* Background tech pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%" className="text-cyan-400">
            <defs>
              <pattern id="tech-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
                <circle cx="20" cy="20" r="2" fill="currentColor" opacity="0.3" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#tech-grid)" />
          </svg>
        </div>

        {/* Angular placeholder design */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="relative mb-4">
              <div className="w-16 h-16 border-2 border-cyan-400/30 transform rotate-45 mx-auto"></div>
              <div className="absolute inset-0 w-12 h-12 border-2 border-purple-400/30 transform rotate-45 m-auto"></div>
              <div className="absolute inset-0 w-8 h-8 border-2 border-blue-400/30 transform rotate-45 m-auto"></div>
            </div>
            <p className="text-zinc-400 font-medium">Revenue Analytics Initializing</p>
            <p className="text-zinc-500 text-sm">Connect your first sale to see real-time data</p>
          </div>
        </div>

        {/* Animated tech elements */}
        <div className="absolute top-4 left-4 w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
        <div className="absolute top-8 right-8 w-2 h-2 bg-purple-400 rounded-full animate-pulse delay-300"></div>
        <div className="absolute bottom-8 left-8 w-2 h-2 bg-blue-400 rounded-full animate-pulse delay-700"></div>
        <div className="absolute bottom-4 right-4 w-2 h-2 bg-green-400 rounded-full animate-pulse delay-1000"></div>
      </div>
    )
  }

  return (
    <div className="h-64 relative">
      {/* Background tech overlay */}
      <div className="absolute inset-0 opacity-5">
        <svg width="100%" height="100%" className="text-cyan-400">
          <defs>
            <pattern id="tech-pattern" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="currentColor" strokeWidth="1" />
              <path d="M 30 0 L 30 30 L 60 30" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#tech-pattern)" />
        </svg>
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <defs>
            {/* Angular gradient definitions */}
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.4} />
              <stop offset="25%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="50%" stopColor="#8b5cf6" stopOpacity={0.2} />
              <stop offset="75%" stopColor="#ec4899" stopOpacity={0.1} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="25%" stopColor="#3b82f6" />
              <stop offset="50%" stopColor="#8b5cf6" />
              <stop offset="75%" stopColor="#ec4899" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>

          <CartesianGrid content={<AngularGrid />} />

          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} dy={10} />

          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#94a3b8", fontSize: 12 }}
            tickFormatter={(value) => `$${value}`}
          />

          {/* Area fill */}
          <Area type="monotone" dataKey="revenue" stroke="none" fill="url(#revenueGradient)" fillOpacity={1} />

          {/* Main trend line */}
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="url(#lineGradient)"
            strokeWidth={3}
            dot={<AngularDot />}
            activeDot={{
              r: 8,
              stroke: "#06b6d4",
              strokeWidth: 2,
              fill: "#06b6d4",
            }}
          />

          {/* Reference line for average */}
          <ReferenceLine
            y={maxRevenue / 2}
            stroke="#64748b"
            strokeDasharray="5 5"
            strokeOpacity={0.5}
            label={{
              value: "Average",
              position: "topRight",
              fill: "#64748b",
              fontSize: 10,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Tech corner indicators */}
      <div className="absolute top-2 right-2 flex space-x-1">
        <div className="w-2 h-2 bg-cyan-400 transform rotate-45 animate-pulse"></div>
        <div className="w-2 h-2 bg-purple-400 transform rotate-45 animate-pulse delay-200"></div>
        <div className="w-2 h-2 bg-blue-400 transform rotate-45 animate-pulse delay-400"></div>
      </div>

      {/* Performance indicator */}
      <div className="absolute bottom-2 left-2 text-xs text-zinc-400">
        <div className="flex items-center gap-1">
          <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse"></div>
          <span>Live Data</span>
        </div>
      </div>
    </div>
  )
}
