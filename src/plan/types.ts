/** Retângulo na planta, em metros: x para a direita, y para baixo (como no desenho). */
export type Rect = { x: number; y: number; w: number; h: number }

/** Lado no desenho da planta (não é o ponto cardeal: o norte está em `Plan.north`). */
export type Side = 'top' | 'bottom' | 'left' | 'right'

export type RoomTone = 'bed' | 'bath' | 'circ' | 'living' | 'outdoor'

export type Room = {
  id: string
  name: string
  rects: Rect[]
  tone: RoomTone
  label: { x: number; y: number }
  area: number
  dims?: string
  note?: string
}

export type Wall = Rect

/** Porta de batente: a dobradiça fica na face da parede do lado para onde abre; `along` vai da dobradiça para o fecho. */
export type Door = {
  hinge: { x: number; y: number }
  width: number
  along: Side
  into: Side
  /** Vão na parede. */
  gap: Rect
}

export type Window = Rect & {
  orientation: 'h' | 'v'
  sill?: number
  head?: number
  /** Porta-janela de batente (duas folhas para dentro) ou de correr. */
  door?: 'swing' | 'sliding'
  /** Lado de dentro da casa, para desenhar as folhas. */
  inside?: Side
}

export type FurnitureKind =
  | 'bed'
  | 'nightstand'
  | 'wardrobe'
  | 'shower'
  | 'toilet'
  | 'sink'
  | 'counter'
  | 'hob'
  | 'tall'
  | 'table'
  | 'sofa'
  | 'generic'

export type Furniture = Rect & {
  kind: FurnitureKind
  label?: string
  /** Cabeceira da cama, costas do sofá ou da sanita. */
  back?: Side
  /** Altura no 3D (móveis genéricos). */
  height?: number
  only2d?: boolean
}

export type Dimension = { x1: number; y1: number; x2: number; y2: number; text?: string }

export type Plan = {
  rooms: Room[]
  walls: Wall[]
  doors: Door[]
  windows: Window[]
  furniture: Furniture[]
  dimensions: Dimension[]
  ceiling: number
  /** Para onde aponta o norte no desenho. */
  north: Side
}
