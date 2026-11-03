import type { Dimension, Door, Furniture, Plan, Rect, Room, RoomTone, Side, Wall, Window } from './types'

/**
 * Planta a partir do esboço. As medidas do esboço são lidas como interiores: 14 × 6 m por dentro das paredes
 * exteriores. O desenho fica como no esboço: poente (pôr do sol) em baixo, norte à esquerda.
 */
export const W = 14
export const D = 6
export const T_EXT = 0.3
export const T_INT = 0.15
/** Parede entre os dois WC. */
export const T_WC = 0.1
export const CEILING = 2.7

/** Faces de cima / da esquerda das paredes interiores, postas sobre as linhas do esboço. */
const X_SALA = 6.95
const X_WC = 8.45
const X_MID = 10.45
const X_END = 11.5
const Y_WC = 1.8
const Y_Q = 2.95

const TERRACE = { x: 2, y: D + T_EXT, w: 3, h: 1.5 }

const fmt = (v: number) => v.toFixed(2).replace('.', ',')
const rect = (x0: number, y0: number, x1: number, y1: number): Rect => ({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 })

/** Troços de a0 a a1 sem os vãos. */
function solid(a0: number, a1: number, gaps: [number, number][]) {
  const out: [number, number][] = []
  let cur = a0
  for (const [g0, g1] of [...gaps].sort((p, q) => p[0] - q[0])) {
    if (g0 > cur) out.push([cur, g0])
    cur = Math.max(cur, g1)
  }
  if (cur < a1) out.push([cur, a1])
  return out
}

/** Parede horizontal de x0 a x1, com a face de cima em y. */
const hWall = (x0: number, x1: number, y: number, t: number, gaps: [number, number][] = []): Wall[] =>
  solid(x0, x1, gaps).map(([a, b]) => ({ x: a, y, w: b - a, h: t }))

/** Parede vertical de y0 a y1, com a face da esquerda em x. */
const vWall = (y0: number, y1: number, x: number, t: number, gaps: [number, number][] = []): Wall[] =>
  solid(y0, y1, gaps).map(([a, b]) => ({ x, y: a, w: t, h: b - a }))

/** Porta numa parede horizontal (`h`, face de cima em `at`) ou vertical (`v`, face da esquerda em `at`), de `from` a `from + width`. */
function door(wall: 'h' | 'v', at: number, t: number, from: number, width: number, into: Side, hinge: 'start' | 'end'): Door {
  const to = from + width
  if (wall === 'h')
    return {
      hinge: { x: hinge === 'start' ? from : to, y: into === 'top' ? at : at + t },
      width,
      along: hinge === 'start' ? 'right' : 'left',
      into,
      gap: { x: from, y: at, w: width, h: t },
    }
  return {
    hinge: { x: into === 'left' ? at : at + t, y: hinge === 'start' ? from : to },
    width,
    along: hinge === 'start' ? 'bottom' : 'top',
    into,
    gap: { x: at, y: from, w: t, h: width },
  }
}

const span = (d: Door): [number, number] => (d.gap.w > d.gap.h ? [d.gap.x, d.gap.x + d.gap.w] : [d.gap.y, d.gap.y + d.gap.h])

const doors = {
  entrada: door('v', -T_EXT, T_EXT, 4.5, 0.9, 'right', 'end'),
  wc1: door('h', Y_WC, T_INT, X_SALA + T_INT + 0.05, 0.7, 'top', 'start'),
  wc2: door('h', Y_WC, T_INT, X_WC + T_WC + 0.1, 0.7, 'top', 'start'),
  quarto1: door('h', Y_Q, T_INT, X_MID - 0.9, 0.8, 'bottom', 'end'),
  quarto2: door('h', Y_Q, T_INT, X_MID + T_INT + 0.05, 0.8, 'bottom', 'start'),
  quarto3: door('v', X_END, T_INT, Y_WC + T_INT + 0.1, 0.8, 'right', 'end'),
}

const walls: Wall[] = [
  // Exteriores: nascente (em cima) e poente (em baixo) a todo o comprimento; norte (à esquerda) com a entrada; sul (à direita).
  ...hWall(-T_EXT, W + T_EXT, -T_EXT, T_EXT),
  ...hWall(-T_EXT, W + T_EXT, D, T_EXT),
  ...vWall(0, D, -T_EXT, T_EXT, [span(doors.entrada)]),
  ...vWall(0, D, W, T_EXT),
  // Salão | WC 1 e salão | quarto 1; entre as duas fica a entrada do corredor.
  ...vWall(0, Y_WC + T_INT, X_SALA, T_INT),
  ...vWall(Y_Q, D, X_SALA, T_INT),
  // Corredor: do lado dos WC e do quarto 3, do lado dos quartos 1 e 2, e o topo com a porta do quarto 3.
  ...hWall(X_SALA + T_INT, X_END + T_INT, Y_WC, T_INT, [span(doors.wc1), span(doors.wc2)]),
  ...hWall(X_SALA + T_INT, W, Y_Q, T_INT, [span(doors.quarto1), span(doors.quarto2)]),
  ...vWall(Y_WC + T_INT, Y_Q, X_END, T_INT, [span(doors.quarto3)]),
  // WC 1 | WC 2, WC 2 | quarto 3 e quarto 1 | quarto 2.
  ...vWall(0, Y_WC, X_WC, T_WC),
  ...vWall(0, Y_WC, X_MID, T_INT),
  ...vWall(Y_Q + T_INT, D, X_MID, T_INT),
]

const windows: Window[] = [
  // Salão: janela a norte e porta-janela de correr para o terraço.
  { x: -T_EXT, y: 0.5, w: T_EXT, h: 1.2, orientation: 'v' },
  { x: TERRACE.x + 0.5, y: D, w: 2, h: T_EXT, orientation: 'h', sill: 0, door: 'sliding', inside: 'top' },
  // WC: janelas pequenas e altas a nascente.
  { x: 7.475, y: -T_EXT, w: 0.6, h: T_EXT, orientation: 'h', sill: 1.4, head: 2 },
  { x: 9.2, y: -T_EXT, w: 0.6, h: T_EXT, orientation: 'h', sill: 1.4, head: 2 },
  // Quartos 3 e 2: janelas a sul.
  { x: W, y: 0.875, w: T_EXT, h: 1.2, orientation: 'v' },
  { x: W, y: 3.95, w: T_EXT, h: 1.2, orientation: 'v' },
  // Quartos 1 e 2: portas-janela a poente.
  { x: 8.075, y: D, w: 1.4, h: T_EXT, orientation: 'h', sill: 0, door: 'swing', inside: 'top' },
  { x: 11.6, y: D, w: 1.4, h: T_EXT, orientation: 'h', sill: 0, door: 'swing', inside: 'top' },
]

function room(id: string, name: string, tone: RoomTone, rects: Rect[], label: { x: number; y: number }, note: string, dims?: string): Room {
  const area = rects.reduce((s, r) => s + r.w * r.h, 0)
  return { id, name, tone, rects, label, area, dims: dims ?? `${fmt(rects[0].w)} × ${fmt(rects[0].h)}`, note }
}

const rooms: Room[] = [
  room(
    'sala',
    'Salão e cozinha',
    'living',
    [rect(0, 0, X_SALA, D)],
    { x: 2.6, y: 4.35 },
    'Salão e cozinha num só espaço, como no esboço. A entrada é a norte; a porta-janela de correr para o terraço não está no esboço e é uma proposta.',
  ),
  room(
    'corredor',
    'Corredor',
    'circ',
    [rect(X_SALA, Y_WC + T_INT, X_END, Y_Q)],
    { x: 8.6, y: 2.5 },
    'Com 1 m livre, como no esboço. Abre para o salão sem porta.',
  ),
  room(
    'wc1',
    'WC 1',
    'bath',
    [rect(X_SALA + T_INT, 0, X_WC, Y_WC)],
    { x: 7.62, y: 1.25 },
    'Sem nome no esboço; pela janela pequena e alta, parece um WC. Com 1,35 m de largura dá para sanita e lavatório.',
  ),
  room(
    'wc2',
    'WC 2',
    'bath',
    [rect(X_WC + T_WC, 0, X_MID, Y_WC)],
    { x: 9.95, y: 1.45 },
    'Sem nome no esboço; pela janela pequena e alta, parece um WC. Dá para base de duche, sanita e lavatório.',
  ),
  room(
    'quarto3',
    'Quarto 3',
    'bed',
    [rect(X_MID + T_INT, 0, W, Y_WC), rect(X_END + T_INT, Y_WC, W, Y_Q)],
    { x: 13.2, y: 2.38 },
    'Sem nome no esboço; tem o tamanho dos outros quartos. A porta fica ao fundo do corredor, no recanto que o esboço tira a este quarto.',
    `${fmt(W - X_MID - T_INT)} × ${fmt(Y_Q)}, sem o recanto do corredor`,
  ),
  room(
    'quarto1',
    'Quarto 1',
    'bed',
    [rect(X_SALA + T_INT, Y_Q + T_INT, X_MID, D)],
    { x: 8.78, y: 4.62 },
    'Porta-janela a poente, como no esboço.',
  ),
  room(
    'quarto2',
    'Quarto 2',
    'bed',
    [rect(X_MID + T_INT, Y_Q + T_INT, W, D)],
    { x: 12.8, y: 5.45 },
    'Janela a sul e porta-janela a poente, como no esboço.',
  ),
  room(
    'terraco',
    'Terraço',
    'outdoor',
    [TERRACE],
    { x: TERRACE.x + TERRACE.w / 2, y: TERRACE.y + 0.75 },
    'Ao lado do salão, virado a poente. O esboço não tem medidas: aqui tem 3,00 × 1,50 m.',
  ),
]

const furniture: Furniture[] = [
  // Salão e cozinha
  { kind: 'counter', x: 0, y: 0, w: 3.2, h: 0.62 },
  { kind: 'counter', x: 0, y: 0.62, w: 0.62, h: 2 },
  { kind: 'sink', x: 0.08, y: 0.85, w: 0.46, h: 0.7, only2d: true },
  { kind: 'hob', x: 1.6, y: 0.06, w: 0.6, h: 0.5, only2d: true },
  { kind: 'tall', x: 3.2, y: 0, w: 0.65, h: 0.65, label: 'Frig.' },
  { kind: 'table', x: 1.7, y: 2.2, w: 1.8, h: 0.9 },
  { kind: 'sofa', x: 4.4, y: 3.5, w: 0.9, h: 2.2, back: 'left' },
  { kind: 'generic', x: 5.5, y: 4.2, w: 0.6, h: 0.8, height: 0.4 },
  { kind: 'generic', x: 6.5, y: 3.8, w: 0.45, h: 1.6, height: 0.5, label: 'TV' },
  // WC 1
  { kind: 'sink', x: 7.2, y: 0, w: 0.55, h: 0.42 },
  { kind: 'toilet', x: 7.8, y: 0.5, w: 0.65, h: 0.4, back: 'right' },
  // WC 2
  { kind: 'sink', x: 8.6, y: 0, w: 0.5, h: 0.42 },
  { kind: 'toilet', x: 9.12, y: 0, w: 0.4, h: 0.65, back: 'top' },
  { kind: 'shower', x: 9.6, y: 0, w: 0.85, h: 1.2 },
  // Quarto 3
  { kind: 'wardrobe', x: 10.6, y: 0, w: 0.6, h: 1.8, label: 'Roupeiro' },
  { kind: 'bed', x: 11.9, y: 0, w: 1.6, h: 2, back: 'top' },
  { kind: 'nightstand', x: 11.4, y: 0.05, w: 0.45, h: 0.45 },
  { kind: 'nightstand', x: 13.55, y: 0.05, w: 0.4, h: 0.45 },
  // Quarto 1
  { kind: 'bed', x: 7.1, y: 3.75, w: 2, h: 1.6, back: 'left' },
  { kind: 'nightstand', x: 7.1, y: 3.25, w: 0.45, h: 0.45 },
  { kind: 'nightstand', x: 7.1, y: 5.4, w: 0.45, h: 0.45 },
  { kind: 'wardrobe', x: 9.85, y: 4, w: 0.6, h: 2, label: 'Roupeiro' },
  // Quarto 2
  { kind: 'bed', x: 12, y: 3.1, w: 1.6, h: 2, back: 'top' },
  { kind: 'nightstand', x: 11.5, y: 3.15, w: 0.45, h: 0.45 },
  { kind: 'nightstand', x: 13.6, y: 3.15, w: 0.4, h: 0.45 },
  { kind: 'wardrobe', x: 10.6, y: 4, w: 0.6, h: 2, label: 'Roupeiro' },
]

const dimensions: Dimension[] = [
  // Por fora.
  { x1: -T_EXT, y1: -1.2, x2: W + T_EXT, y2: -1.2 },
  { x1: -1.2, y1: -T_EXT, x2: -1.2, y2: D + T_EXT },
  // Divisões, por dentro.
  { x1: 0, y1: -0.7, x2: X_SALA, y2: -0.7 },
  { x1: X_SALA + T_INT, y1: -0.7, x2: X_WC, y2: -0.7 },
  { x1: X_WC + T_WC, y1: -0.7, x2: X_MID, y2: -0.7 },
  { x1: X_MID + T_INT, y1: -0.7, x2: W, y2: -0.7 },
  { x1: -0.7, y1: 0, x2: -0.7, y2: D },
  { x1: W + 0.7, y1: 0, x2: W + 0.7, y2: Y_Q },
  { x1: W + 0.7, y1: Y_Q + T_INT, x2: W + 0.7, y2: D },
  { x1: X_SALA + T_INT, y1: D + 0.7, x2: X_MID, y2: D + 0.7 },
  { x1: X_MID + T_INT, y1: D + 0.7, x2: W, y2: D + 0.7 },
  // Terraço.
  { x1: TERRACE.x, y1: TERRACE.y + TERRACE.h + 0.4, x2: TERRACE.x + TERRACE.w, y2: TERRACE.y + TERRACE.h + 0.4 },
  { x1: TERRACE.x - 0.4, y1: TERRACE.y, x2: TERRACE.x - 0.4, y2: TERRACE.y + TERRACE.h },
]

export const house: Plan = {
  rooms,
  walls,
  doors: Object.values(doors),
  windows,
  furniture,
  dimensions,
  ceiling: CEILING,
  north: 'left',
}

/** Área de implantação, por fora das paredes exteriores. */
export const footprint: Rect = { x: -T_EXT, y: -T_EXT, w: W + 2 * T_EXT, h: D + 2 * T_EXT }
