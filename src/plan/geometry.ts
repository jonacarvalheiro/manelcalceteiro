import type { Furniture, Rect } from './types'

/** Cadeiras à volta da mesa, nos dois lados compridos (meio metidas debaixo do tampo). */
export function chairs(f: Furniture): Rect[] {
  const along = f.w >= f.h
  const len = along ? f.w : f.h
  const n = Math.max(1, Math.round(len / 0.65))
  const out: Rect[] = []
  for (let i = 0; i < n; i++) {
    const c = (along ? f.x : f.y) + (len * (i + 0.5)) / n
    for (const s of [0, 1]) {
      if (along) out.push({ x: c - 0.21, y: s ? f.y + f.h - 0.1 : f.y - 0.3, w: 0.42, h: 0.4 })
      else out.push({ x: s ? f.x + f.w - 0.1 : f.x - 0.3, y: c - 0.21, w: 0.4, h: 0.42 })
    }
  }
  return out
}
