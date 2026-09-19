import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useThemeColors } from '@/hooks/useThemeColors'
import { formatINR, formatINRCompact } from '@/lib/format'

function TrendTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  return (
    <div className="rounded-lg bg-black px-3 py-2 text-white shadow-lift">
      <p className="text-xs text-white/70">{point.day}</p>
      <p className="font-mono text-sm font-medium">{formatINR(point.amount)}</p>
    </div>
  )
}

/** Single-series area chart of daily sales. Hover shows the exact figure; a hidden table covers screen readers. */
export function SalesTrendChart({ data }) {
  const c = useThemeColors(['--green-deep', '--green-fresh', '--mint-pale', '--text-muted', '--white'])
  const lastIndex = data.length - 1

  return (
    <div>
      <div className="h-64 w-full xl:h-80" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={c.greenFresh} stopOpacity={0.28} />
                <stop offset="100%" stopColor={c.greenFresh} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke={c.mintPale} />
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              tick={{ fill: c.textMuted, fontSize: 12 }}
              dy={8}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={52}
              tick={{ fill: c.textMuted, fontSize: 12 }}
              tickFormatter={formatINRCompact}
            />
            <Tooltip content={<TrendTooltip />} cursor={{ stroke: c.greenDeep, strokeDasharray: '4 4' }} />
            <Area
              type="monotone"
              dataKey="amount"
              stroke={c.greenDeep}
              strokeWidth={2}
              fill="url(#salesFill)"
              dot={(props) => {
                const { cx, cy, index } = props
                const isToday = index === lastIndex
                return (
                  <circle
                    key={index}
                    cx={cx}
                    cy={cy}
                    r={isToday ? 6 : 4}
                    fill={isToday ? c.greenFresh : c.greenDeep}
                    stroke={c.white}
                    strokeWidth={2}
                  />
                )
              }}
              activeDot={{ r: 6, fill: c.greenDeep, stroke: c.white, strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <table className="sr-only">
        <caption>Daily sales, last 7 days</caption>
        <thead>
          <tr>
            <th>Day</th>
            <th>Sales</th>
          </tr>
        </thead>
        <tbody>
          {data.map((point) => (
            <tr key={point.day}>
              <td>{point.day}</td>
              <td>{formatINR(point.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
