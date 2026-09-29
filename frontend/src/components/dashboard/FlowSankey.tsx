import { formatCurrency } from '@/lib/utils'

interface FlowSankeyProps {
  currency: string
  gross: number
  net: number
  platformFees: number
  withdrawalFees: number
  entryCount: number
  inBank: number
  ready: number
  onTheWay: number
}

const W = 1096
const PAD_TOP = 36
const EARN_BAR = 12
const BLOCK_END = 436
const MID_X = 436
const RIGHT_X = 874
const LABEL_X = 906
const GAP = 26
const SCALE_H = 200

function ribbon(x0: number, y0: number, x1: number, y1: number, h: number) {
  const xm = (x0 + x1) / 2
  return `M${x0},${y0} C${xm},${y0} ${xm},${y1} ${x1},${y1} L${x1},${y1 + h} C${xm},${y1 + h} ${xm},${y0 + h} ${x0},${y0 + h} Z`
}

export default function FlowSankey({
  currency, gross, net, platformFees, withdrawalFees, entryCount, inBank, ready, onTheWay,
}: FlowSankeyProps) {
  const fees = platformFees + withdrawalFees
  const feePct = gross > 0 ? (fees / gross) * 100 : 0
  const netH = Math.max((Math.max(net, 0) / gross) * SCALE_H, 0)
  const feeH = SCALE_H - netH

  const targets = [
    { key: 'bank', label: 'In bank', value: inBank, color: 'var(--color-gold)', fill: 0.55 },
    { key: 'ready', label: 'Ready to withdraw', value: ready, color: 'var(--color-sky)', fill: 0.38 },
    { key: 'way', label: 'On the way', value: onTheWay, color: 'var(--color-lilac)', fill: 0.3 },
  ].filter(t => t.value > 0.004)

  const totalTarget = targets.reduce((a, t) => a + t.value, 0) || 1
  let srcY = 0
  let dstY = 0
  const placed = targets.map(t => {
    const h = Math.max((t.value / totalTarget) * netH, 6)
    const node = { ...t, h, sy: srcY, dy: dstY }
    srcY += h
    dstY += h + GAP
    return node
  })
  const rightBottom = dstY - GAP
  const feeNodeY = netH + 44
  const bottom = Math.max(SCALE_H, rightBottom, fees > 0 ? feeNodeY + Math.max(feeH, 8) + 30 : 0)
  const H = bottom + PAD_TOP + 8

  const ink = 'var(--color-ink)'
  const muted = 'var(--color-muted)'
  const display = 'var(--font-display)'

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full min-w-[760px] h-auto block"
        role="img"
        aria-label={`Money flow: ${formatCurrency(gross, currency)} earned, ${formatCurrency(fees, currency)} in fees, ${formatCurrency(net, currency)} net`}
      >
        <g transform={`translate(0 ${PAD_TOP})`}>
          {/* net after fees label */}
          <text x={MID_X - 12} y={-14} fontSize="13" fill={muted}>
            Net after fees{' '}
            <tspan fill={ink} fontWeight="700">{formatCurrency(net, currency)}</tspan>
          </text>

          {/* earned block */}
          <rect x={EARN_BAR} y={0} width={BLOCK_END - EARN_BAR} height={netH} fill="#3b3352" />
          <rect x={0} y={0} width={EARN_BAR} height={SCALE_H} rx="2" fill="var(--color-lilac)" />
          <text x={32} y={30} fontSize="13" fill={muted}>Earned</text>
          <text x={32} y={62} fontSize="27" fontWeight="600" fill={ink} style={{ fontFamily: display, letterSpacing: '-0.02em' }}>
            {formatCurrency(gross, currency)}
          </text>
          <text x={32} y={88} fontSize="13" fill={muted}>
            {entryCount} {entryCount === 1 ? 'entry' : 'entries'}
          </text>

          {/* fees */}
          {fees > 0 && (
            <>
              <path d={ribbon(EARN_BAR, netH, MID_X, feeNodeY, Math.max(feeH, 3))} fill="var(--color-coral)" fillOpacity="0.4" />
              <rect x={MID_X} y={feeNodeY} width="12" height={Math.max(feeH, 6)} rx="2" fill="var(--color-coral)" />
              <text x={MID_X + 26} y={feeNodeY + 12} fontSize="13" fill="var(--color-salmon)">
                {withdrawalFees > 0
                  ? `−${formatCurrency(fees, currency)} fees (${feePct.toFixed(1)}%)`
                  : `−${formatCurrency(platformFees, currency)} platform fees (${feePct.toFixed(1)}%)`}
              </text>
              <text x={MID_X + 26} y={feeNodeY + 34} fontSize="12" fill={muted}>
                {withdrawalFees > 0
                  ? `${formatCurrency(platformFees, currency)} platform · ${formatCurrency(withdrawalFees, currency)} withdrawal`
                  : 'No withdrawal fees'}
              </text>
            </>
          )}

          {/* middle bar + ribbons to destinations */}
          <rect x={MID_X} y={0} width="12" height={netH} rx="2" fill="var(--color-lilac)" />
          {placed.map(t => (
            <g key={t.key}>
              <path d={ribbon(MID_X + 12, t.sy, RIGHT_X, t.dy, t.h)} fill={t.color} fillOpacity={t.fill} />
              <rect x={RIGHT_X} y={t.dy} width="12" height={t.h} rx="2" fill={t.color} />
              <text x={LABEL_X} y={t.dy + Math.max(t.h / 2, 24) - 12} fontSize="13" fill={muted}>{t.label}</text>
              <text
                x={LABEL_X}
                y={t.dy + Math.max(t.h / 2, 24) + 16}
                fontSize="27"
                fontWeight="600"
                fill={t.color}
                style={{ fontFamily: display, letterSpacing: '-0.02em' }}
              >
                {formatCurrency(t.value, currency)}
              </text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  )
}
