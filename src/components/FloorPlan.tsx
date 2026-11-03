import { useId } from 'react'
import { chairs } from '@/plan/geometry'
import type { Door, Furniture, Plan, Room, RoomTone, Side, Window } from '@/plan/types'

const toneFill: Record<RoomTone, string> = {
  bed: '#f5ecdc',
  bath: '#dcebf3',
  circ: '#f1f0ec',
  living: '#efe9e1',
  outdoor: '#ebe7df',
}
const toneHover: Record<RoomTone, string> = {
  bed: '#ecd9b8',
  bath: '#bcdaea',
  circ: '#e2e0d8',
  living: '#e2d6c6',
  outdoor: '#ddd5c6',
}

const vec: Record<Side, [number, number]> = { top: [0, -1], bottom: [0, 1], left: [-1, 0], right: [1, 0] }
const turn: Record<Side, number> = { top: 0, right: 90, bottom: 180, left: -90 }
const fmt = (v: number) => v.toFixed(2).replace('.', ',')

type Props = {
  plan: Plan
  showFurniture: boolean
  showDims: boolean
  hovered: string | null
  onHover: (id: string | null) => void
}

/** Limites do desenho: paredes, divisões e cotas (as cotas contam sempre, para a planta não saltar ao ligá-las). */
function bounds(plan: Plan) {
  const xs: number[] = []
  const ys: number[] = []
  for (const r of [...plan.walls, ...plan.rooms.flatMap((room) => room.rects)]) xs.push(r.x, r.x + r.w), ys.push(r.y, r.y + r.h)
  for (const d of plan.dimensions) xs.push(d.x1, d.x2), ys.push(d.y1, d.y2)
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) }
}

export function FloorPlan({ plan, showFurniture, showDims, hovered, onHover }: Props) {
  const uid = useId().replace(/:/g, '')
  const b = bounds(plan)
  const box = { x: b.x0 - 0.45, y: b.y0 - 0.45, w: b.x1 - b.x0 + 1.55, h: b.y1 - b.y0 + 1.05 }

  return (
    <svg viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`} className="h-auto w-full select-none" role="img" aria-label="Planta">
      <defs>
        <pattern id={`paving-${uid}`} width="0.5" height="0.5" patternUnits="userSpaceOnUse">
          <rect width="0.5" height="0.5" fill="none" stroke="#d6cfc2" strokeWidth="0.012" />
        </pattern>
      </defs>

      {plan.rooms.map((room) => (
        <RoomShape key={room.id} room={room} active={hovered === room.id} onHover={onHover} uid={uid} />
      ))}

      {showFurniture && plan.furniture.map((f, i) => <FurnitureShape key={i} f={f} />)}

      {plan.walls.map((w, i) => (
        <rect key={i} x={w.x} y={w.y} width={w.w} height={w.h} fill="#292524" />
      ))}

      {plan.windows.map((w, i) => (
        <WindowShape key={i} win={w} />
      ))}

      {plan.doors.map((d, i) => (
        <DoorShape key={i} door={d} />
      ))}

      {plan.rooms.map((room) => (
        <RoomLabel key={room.id} room={room} showDims={showDims} />
      ))}

      {showDims && plan.dimensions.map((d, i) => <DimLine key={i} {...d} />)}

      <NorthArrow x={b.x1 + 0.6} y={b.y0 + 0.3} side={plan.north} />
      <ScaleBar x={b.x0} y={b.y1 + 0.5} />
    </svg>
  )
}

function RoomShape({ room, active, onHover, uid }: { room: Room; active: boolean; onHover: (id: string | null) => void; uid: string }) {
  const outdoor = room.tone === 'outdoor'
  return (
    <g onMouseEnter={() => onHover(room.id)} onMouseLeave={() => onHover(null)} onClick={() => onHover(room.id)} className="cursor-pointer">
      {room.rects.map((r, i) => (
        <g key={i}>
          <rect
            x={r.x}
            y={r.y}
            width={r.w}
            height={r.h}
            fill={active ? toneHover[room.tone] : toneFill[room.tone]}
            stroke={outdoor ? '#a8a29e' : undefined}
            strokeWidth={outdoor ? 0.02 : undefined}
            style={{ transition: 'fill 150ms' }}
          />
          {outdoor && <rect x={r.x} y={r.y} width={r.w} height={r.h} fill={`url(#paving-${uid})`} pointerEvents="none" />}
        </g>
      ))}
    </g>
  )
}

function RoomLabel({ room, showDims }: { room: Room; showDims: boolean }) {
  const { x, y } = room.label
  const big = room.tone === 'bed' || room.tone === 'living'
  const fs = big ? 0.24 : 0.17
  const areaY = y + fs + 0.04
  const dimsY = y + fs + 0.25
  const name = { fontWeight: 600, fill: '#1c1917', stroke: 'white', strokeWidth: 0.05, paintOrder: 'stroke' } as const
  return (
    <g pointerEvents="none">
      <text x={x} y={y} textAnchor="middle" fontSize={fs} {...name}>
        {room.name}
      </text>
      <text x={x} y={areaY} textAnchor="middle" fontSize={0.16} fill="#57534e" stroke="white" strokeWidth={0.04} paintOrder="stroke">
        {fmt(room.area)} m²
      </text>
      {showDims && big && room.dims && (
        <text x={x} y={dimsY} textAnchor="middle" fontSize={0.12} fill="#78716c" stroke="white" strokeWidth={0.03} paintOrder="stroke">
          {room.dims}
        </text>
      )}
    </g>
  )
}

function WindowShape({ win }: { win: Window }) {
  const { x, y, w, h, orientation } = win
  const color = '#0ea5e9'
  const line = { stroke: color, strokeWidth: 0.015 }
  const horizontal = orientation === 'h'
  const frame = <rect x={x} y={y} width={w} height={h} fill="white" {...line} />

  if (win.door === 'sliding') {
    const m = horizontal ? y + h / 2 : x + w / 2
    return horizontal ? (
      <g>
        {frame}
        <line x1={x} y1={m - 0.04} x2={x + w * 0.55} y2={m - 0.04} {...line} strokeWidth={0.03} />
        <line x1={x + w * 0.45} y1={m + 0.04} x2={x + w} y2={m + 0.04} {...line} strokeWidth={0.03} />
      </g>
    ) : (
      <g>
        {frame}
        <line x1={m - 0.04} y1={y} x2={m - 0.04} y2={y + h * 0.55} {...line} strokeWidth={0.03} />
        <line x1={m + 0.04} y1={y + h * 0.45} x2={m + 0.04} y2={y + h} {...line} strokeWidth={0.03} />
      </g>
    )
  }

  const m = horizontal ? y + h / 2 : x + w / 2
  const glass = horizontal ? (
    <>
      <line x1={x} y1={m - 0.04} x2={x + w} y2={m - 0.04} {...line} />
      <line x1={x} y1={m + 0.04} x2={x + w} y2={m + 0.04} {...line} />
    </>
  ) : (
    <>
      <line x1={m - 0.04} y1={y} x2={m - 0.04} y2={y + h} {...line} />
      <line x1={m + 0.04} y1={y} x2={m + 0.04} y2={y + h} {...line} />
    </>
  )
  if (win.door !== 'swing' || !win.inside) {
    return (
      <g>
        {frame}
        {glass}
      </g>
    )
  }

  // Porta-janela de duas folhas a abrir para dentro.
  const [ix, iy] = vec[win.inside]
  const leaf = (horizontal ? w : h) / 2
  const face = horizontal ? (iy < 0 ? y : y + h) : ix < 0 ? x : x + w
  const hinges = horizontal
    ? [
        { hx: x, hy: face, cx: x + leaf, cy: face },
        { hx: x + w, hy: face, cx: x + w - leaf, cy: face },
      ]
    : [
        { hx: face, hy: y, cx: face, cy: y + leaf },
        { hx: face, hy: y + h, cx: face, cy: y + h - leaf },
      ]
  return (
    <g pointerEvents="none">
      {frame}
      {glass}
      {hinges.map(({ hx, hy, cx, cy }, i) => {
        const ox = hx + ix * leaf
        const oy = hy + iy * leaf
        const ax = Math.sign(cx - hx)
        const ay = Math.sign(cy - hy)
        const sweep = ax * iy - ay * ix > 0 ? 1 : 0
        return (
          <g key={i}>
            <line x1={hx} y1={hy} x2={ox} y2={oy} stroke={color} strokeWidth={0.02} />
            <path d={`M ${cx} ${cy} A ${leaf} ${leaf} 0 0 ${sweep} ${ox} ${oy}`} fill="none" stroke={color} strokeWidth={0.01} strokeDasharray="0.04 0.03" />
          </g>
        )
      })}
    </g>
  )
}

function DoorShape({ door }: { door: Door }) {
  const [ax, ay] = vec[door.along]
  const [ix, iy] = vec[door.into]
  const { x: hx, y: hy } = door.hinge
  const cx = hx + ax * door.width
  const cy = hy + ay * door.width
  const ox = hx + ix * door.width
  const oy = hy + iy * door.width
  const sweep = ax * iy - ay * ix > 0 ? 1 : 0
  return (
    <g pointerEvents="none">
      <line x1={hx} y1={hy} x2={ox} y2={oy} stroke="#292524" strokeWidth={0.03} />
      <path d={`M ${cx} ${cy} A ${door.width} ${door.width} 0 0 ${sweep} ${ox} ${oy}`} fill="none" stroke="#78716c" strokeWidth={0.012} strokeDasharray="0.04 0.03" />
    </g>
  )
}

function FurnitureShape({ f }: { f: Furniture }) {
  const stroke = '#a8a29e'
  const common = { stroke, strokeWidth: 0.012, pointerEvents: 'none' as const }
  const cx = f.x + f.w / 2
  const cy = f.y + f.h / 2
  const label = f.label ? (
    <text
      x={cx}
      y={cy + 0.04}
      textAnchor="middle"
      fontSize={0.1}
      fill="#78716c"
      pointerEvents="none"
      transform={f.h > f.w * 1.6 ? `rotate(-90 ${cx} ${cy})` : undefined}
    >
      {f.label}
    </text>
  ) : null

  switch (f.kind) {
    case 'bed': {
      const back = f.back ?? 'top'
      const across = back === 'left' || back === 'right'
      const pillow = (i: number) =>
        across
          ? { x: back === 'left' ? f.x + 0.06 : f.x + f.w - 0.41, y: i ? f.y + f.h / 2 + 0.04 : f.y + 0.08, w: 0.35, h: f.h / 2 - 0.12 }
          : { x: i ? f.x + f.w / 2 + 0.04 : f.x + 0.08, y: back === 'top' ? f.y + 0.06 : f.y + f.h - 0.41, w: f.w / 2 - 0.12, h: 0.35 }
      const fold = back === 'left' ? f.x + 0.55 : back === 'right' ? f.x + f.w - 0.55 : back === 'top' ? f.y + 0.55 : f.y + f.h - 0.55
      return (
        <g>
          <rect x={f.x} y={f.y} width={f.w} height={f.h} rx={0.04} fill="white" {...common} />
          {[0, 1].map((i) => {
            const p = pillow(i)
            return <rect key={i} x={p.x} y={p.y} width={p.w} height={p.h} rx={0.05} fill="#fafaf9" {...common} />
          })}
          {across ? <line x1={fold} y1={f.y} x2={fold} y2={f.y + f.h} {...common} /> : <line x1={f.x} y1={fold} x2={f.x + f.w} y2={fold} {...common} />}
        </g>
      )
    }
    case 'wardrobe':
      return (
        <g>
          <rect x={f.x} y={f.y} width={f.w} height={f.h} fill="#fafaf9" {...common} />
          {f.w > f.h ? (
            <line x1={f.x} y1={f.y + f.h / 2} x2={f.x + f.w} y2={f.y + f.h / 2} {...common} strokeDasharray="0.05 0.03" />
          ) : (
            <line x1={f.x + f.w / 2} y1={f.y} x2={f.x + f.w / 2} y2={f.y + f.h} {...common} strokeDasharray="0.05 0.03" />
          )}
          {label}
        </g>
      )
    case 'shower':
      return (
        <g>
          <rect x={f.x} y={f.y} width={f.w} height={f.h} fill="#f0f9ff" {...common} />
          <line x1={f.x} y1={f.y} x2={f.x + f.w} y2={f.y + f.h} {...common} />
          <line x1={f.x + f.w} y1={f.y} x2={f.x} y2={f.y + f.h} {...common} />
          <circle cx={cx} cy={cy} r={0.05} fill="white" {...common} />
        </g>
      )
    case 'toilet': {
      const back = f.back ?? 'top'
      if (back === 'left' || back === 'right') {
        const tankX = back === 'right' ? f.x + f.w - 0.18 : f.x
        const bowlCx = back === 'right' ? f.x + 0.24 : f.x + f.w - 0.24
        return (
          <g>
            <rect x={tankX} y={f.y} width={0.18} height={f.h} rx={0.03} fill="white" {...common} />
            <ellipse cx={bowlCx} cy={cy} rx={0.24} ry={f.h / 2 - 0.02} fill="white" {...common} />
          </g>
        )
      }
      const tankY = back === 'bottom' ? f.y + f.h - 0.18 : f.y
      const bowlCy = back === 'bottom' ? f.y + 0.24 : f.y + f.h - 0.24
      return (
        <g>
          <rect x={f.x} y={tankY} width={f.w} height={0.18} rx={0.03} fill="white" {...common} />
          <ellipse cx={cx} cy={bowlCy} rx={f.w / 2 - 0.02} ry={0.24} fill="white" {...common} />
        </g>
      )
    }
    case 'sink':
      return (
        <g>
          <rect x={f.x} y={f.y} width={f.w} height={f.h} rx={0.03} fill="white" {...common} />
          <ellipse cx={cx} cy={cy} rx={Math.min(f.w, f.h) * 0.35} ry={Math.min(f.w, f.h) * 0.28} fill="#f0f9ff" {...common} />
        </g>
      )
    case 'counter':
      return <rect x={f.x} y={f.y} width={f.w} height={f.h} fill="#f5f5f4" {...common} />
    case 'hob':
      return (
        <g>
          {[
            [0.27, 0.27],
            [0.73, 0.27],
            [0.27, 0.73],
            [0.73, 0.73],
          ].map(([u, v], i) => (
            <circle key={i} cx={f.x + u * f.w} cy={f.y + v * f.h} r={Math.min(f.w, f.h) * 0.17} fill="none" {...common} />
          ))}
        </g>
      )
    case 'tall':
      return (
        <g>
          <rect x={f.x} y={f.y} width={f.w} height={f.h} fill="#fafaf9" {...common} />
          <line x1={f.x} y1={f.y} x2={f.x + f.w} y2={f.y + f.h} {...common} />
          {label}
        </g>
      )
    case 'table':
      return (
        <g>
          {chairs(f).map((c, i) => (
            <rect key={i} x={c.x} y={c.y} width={c.w} height={c.h} rx={0.05} fill="white" {...common} />
          ))}
          <rect x={f.x} y={f.y} width={f.w} height={f.h} rx={0.04} fill="#fafaf9" {...common} />
        </g>
      )
    case 'sofa': {
      const back = f.back ?? 'top'
      const across = back === 'left' || back === 'right'
      const t = 0.2
      const backRect = across
        ? { x: back === 'left' ? f.x : f.x + f.w - t, y: f.y, w: t, h: f.h }
        : { x: f.x, y: back === 'top' ? f.y : f.y + f.h - t, w: f.w, h: t }
      const arms = across
        ? [
            { x: f.x, y: f.y, w: f.w, h: 0.18 },
            { x: f.x, y: f.y + f.h - 0.18, w: f.w, h: 0.18 },
          ]
        : [
            { x: f.x, y: f.y, w: 0.18, h: f.h },
            { x: f.x + f.w - 0.18, y: f.y, w: 0.18, h: f.h },
          ]
      return (
        <g>
          <rect x={f.x} y={f.y} width={f.w} height={f.h} rx={0.06} fill="white" {...common} />
          {[backRect, ...arms].map((r, i) => (
            <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} rx={0.04} fill="#f5f5f4" {...common} />
          ))}
        </g>
      )
    }
    default:
      return (
        <g>
          <rect x={f.x} y={f.y} width={f.w} height={f.h} rx={0.03} fill="white" {...common} />
          {label}
        </g>
      )
  }
}

function DimLine({ x1, y1, x2, y2, text }: { x1: number; y1: number; x2: number; y2: number; text?: string }) {
  const horizontal = Math.abs(y1 - y2) < 1e-6
  const len = horizontal ? Math.abs(x2 - x1) : Math.abs(y2 - y1)
  const label = text ?? fmt(len)
  const tick = 0.07
  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2
  return (
    <g pointerEvents="none" stroke="#78716c" strokeWidth={0.012}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} />
      <line x1={x1 - tick} y1={y1 + tick} x2={x1 + tick} y2={y1 - tick} />
      <line x1={x2 - tick} y1={y2 + tick} x2={x2 + tick} y2={y2 - tick} />
      {horizontal ? (
        <text x={mx} y={my - 0.08} textAnchor="middle" fontSize={0.15} fill="#57534e" stroke="none">
          {label}
        </text>
      ) : (
        <text x={mx - 0.08} y={my} textAnchor="middle" fontSize={0.15} fill="#57534e" stroke="none" transform={`rotate(-90 ${mx - 0.08} ${my})`}>
          {label}
        </text>
      )}
    </g>
  )
}

/** Seta do norte, a apontar para o lado do desenho onde fica o norte. */
function NorthArrow({ x, y, side }: { x: number; y: number; side: Side }) {
  const [dx, dy] = vec[side]
  return (
    <g pointerEvents="none">
      <circle cx={x} cy={y} r={0.28} fill="white" stroke="#a8a29e" strokeWidth={0.015} />
      <path
        d={`M ${x} ${y - 0.22} L ${x + 0.1} ${y + 0.12} L ${x} ${y + 0.05} L ${x - 0.1} ${y + 0.12} Z`}
        fill="#292524"
        transform={`rotate(${turn[side]} ${x} ${y})`}
      />
      <text x={x + dx * 0.42} y={y + dy * 0.42 + 0.05} textAnchor="middle" fontSize={0.15} fontWeight={700} fill="#292524">
        N
      </text>
    </g>
  )
}

function ScaleBar({ x, y }: { x: number; y: number }) {
  return (
    <g pointerEvents="none">
      {[0, 1, 2].map((i) => (
        <rect key={i} x={x + i} y={y - 0.08} width={1} height={0.08} fill={i % 2 ? 'white' : '#292524'} stroke="#292524" strokeWidth={0.01} />
      ))}
      <text x={x} y={y - 0.14} fontSize={0.12} fill="#57534e">
        0
      </text>
      <text x={x + 3} y={y - 0.14} fontSize={0.12} fill="#57534e" textAnchor="middle">
        3 m
      </text>
    </g>
  )
}
