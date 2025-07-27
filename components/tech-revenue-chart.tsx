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

// Simple dot component for minimal design
const MinimalDot = (props: any) => {
  const { cx, cy, fill } = props
  return (
    <g>
      <circle cx={cx} cy={cy} r="4" fill="none" stroke={fill} strokeWidth="2" opacity="0.8" />
      <circle cx={cx} cy={cy} r="2" fill={fill} opacity="1" />
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

    // Add trend calculation
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
        {/* Simple grid background */}
        <div className="absolute inset-0 opacity-5">
          <svg width="100%" height="100%" className="text-zinc-400">
            <defs>
              <pattern id="simple-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#simple-grid)" />
          </svg>
        </div>

        {/* Simple placeholder design */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="relative mb-4">
              <div className="w-12 h-12 border-2 border-zinc-600 rounded mx-auto"></div>
              <div className="absolute inset-0 w-8 h-8 border-2 border-zinc-500 rounded m-auto"></div>
              <div className="absolute inset-0 w-4 h-4 border-2 border-zinc-400 rounded m-auto"></div>
            </div>
            <p className="text-zinc-400 font-medium">Revenue Analytics Initializing</p>
            <p className="text-zinc-500 text-sm">Connect your first sale to see real-time data</p>
          </div>
        </div>

        {/* Simple indicator dots */}
        <div className="absolute top-4 left-4 w-2 h-2 bg-zinc-400 rounded-full animate-pulse"></div>
        <div className="absolute top-8 right-8 w-2 h-2 bg-zinc-500 rounded-full animate-pulse delay-300"></div>
        <div className="absolute bottom-8 left-8 w-2 h-2 bg-zinc-400 rounded-full animate-pulse delay-700"></div>
        <div className="absolute bottom-4 right-4 w-2 h-2 bg-zinc-500 rounded-full animate-pulse delay-1000"></div>
      </div>
    )
  }

  return (
    <div className="h-64 relative">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <defs>
            {/* Simple monochrome gradient */}
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity={0.1} />
              <stop offset="50%" stopColor="#71717a" stopOpacity={0.05} />
              <stop offset="100%" stopColor="#27272a" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.3} />

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
            stroke="#ffffff"
            strokeWidth={2}
            dot={<MinimalDot />}
            activeDot={{
              r: 6,
              stroke: "#ffffff",
              strokeWidth: 2,
              fill: "#ffffff",
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

      {/* Simple corner indicators */}
      <div className="absolute top-2 right-2 flex space-x-1">
        <div className="w-2 h-2 bg-zinc-400 rounded-full animate-pulse"></div>
        <div className="w-2 h-2 bg-zinc-500 rounded-full animate-pulse delay-200"></div>
        <div className="w-2 h-2 bg-zinc-600 rounded-full animate-pulse delay-400"></div>
      </div>

      {/* Performance indicator */}
      <div className="absolute bottom-2 left-2 text-xs text-zinc-400">
        <div className="flex items-center gap-1">
          <div className="w-1 h-1 bg-zinc-400 rounded-full animate-pulse"></div>
          <span>Live Data</span>
        </div>
      </div>
    </div>
  )
}
