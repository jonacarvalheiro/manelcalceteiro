import { Edges, OrbitControls } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { type RefObject, useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { chairs } from '@/plan/geometry'
import type { Door, Furniture, Plan, Rect, RoomTone, Side, Wall, Window } from '@/plan/types'
import { WalkControls } from './WalkControls'
import { cameraPresets, type CameraPreset } from './cameraPresets'

const HEAD = 2.1
const SILL = 0.9
const DOOR_H = 2.05

const floorColor: Record<RoomTone, string> = {
  bed: '#d8b48a',
  bath: '#e4ecef',
  circ: '#d9d3c7',
  living: '#cfae86',
  outdoor: '#ddd8ce',
}

type Props = {
  plan: Plan
  preset: CameraPreset
  showFurniture: boolean
  showLabels: boolean
  cutWalls: boolean
  walk: boolean
}

type Label = { x: number; z: number; h: number; title: string; sub?: string }

export default function House3D(props: Props) {
  const overlay = useRef<HTMLDivElement>(null)
  const labels = useMemo<Label[]>(() => {
    if (!props.showLabels) return []
    return props.plan.rooms.map((r) => ({
      x: r.label.x,
      z: r.label.y,
      h: props.walk ? 1.75 : 0.9,
      title: r.name,
      sub: `${r.area.toFixed(1).replace('.', ',')} m²`,
    }))
  }, [props.plan, props.showLabels, props.walk])

  return (
    <div className="relative h-full w-full">
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ fov: props.walk ? 68 : 42, position: cameraPresets[props.preset].pos, near: 0.08, far: 200 }}
        gl={{ preserveDrawingBuffer: true, antialias: true }}
      >
        <color attach="background" args={['#f3f0ea']} />
        <hemisphereLight args={['#ffffff', '#d6cfc2', 0.9]} />
        <directionalLight
          position={[9, 14, 11]}
          intensity={1.6}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-16}
          shadow-camera-right={16}
          shadow-camera-top={16}
          shadow-camera-bottom={-16}
          shadow-bias={-0.0004}
        />
        <Scene {...props} />
        {props.walk ? (
          <WalkControls plan={props.plan} preset={props.preset} />
        ) : (
          <>
            <OrbitControls makeDefault enableDamping maxPolarAngle={Math.PI / 2 - 0.02} minDistance={1} maxDistance={40} />
            <CameraRig preset={props.preset} />
            <OrbitFov />
          </>
        )}
        <LabelProjector labels={labels} overlay={overlay} />
      </Canvas>
      <div ref={overlay} className="pointer-events-none absolute inset-0 overflow-hidden">
        {labels.map((l, i) => (
          <div
            key={i}
            className="absolute top-0 left-0 rounded-full bg-white/90 px-2.5 py-1 text-[11px] leading-tight font-semibold whitespace-nowrap text-stone-800 shadow-sm ring-1 ring-stone-900/10"
            style={{ visibility: 'hidden' }}
          >
            {l.title}
            {l.sub && <span className="ml-1 font-normal text-stone-500">{l.sub}</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

function LabelProjector({ labels, overlay }: { labels: Label[]; overlay: RefObject<HTMLDivElement | null> }) {
  const { camera, size } = useThree()
  const v = useMemo(() => new THREE.Vector3(), [])
  useFrame(() => {
    const nodes = overlay.current?.children
    if (!nodes) return
    labels.forEach((l, i) => {
      const el = nodes[i] as HTMLElement | undefined
      if (!el) return
      v.set(l.x, l.h, l.z).project(camera)
      if (v.z > 1) {
        el.style.visibility = 'hidden'
        return
      }
      const px = ((v.x + 1) / 2) * size.width
      const py = ((1 - v.y) / 2) * size.height
      el.style.transform = `translate(-50%, -50%) translate(${px}px, ${py}px)`
      el.style.visibility = 'visible'
    })
  })
  return null
}

function OrbitFov() {
  const { camera } = useThree()
  useEffect(() => {
    if (!('fov' in camera)) return
    camera.fov = 42
    camera.updateProjectionMatrix()
  }, [camera])
  return null
}

function CameraRig({ preset }: { preset: CameraPreset }) {
  const { camera, controls } = useThree() as unknown as { camera: THREE.PerspectiveCamera; controls: OrbitControlsImpl | null }
  const goal = useRef({
    pos: new THREE.Vector3(...cameraPresets[preset].pos),
    target: new THREE.Vector3(...cameraPresets[preset].target),
    active: true,
  })

  useEffect(() => {
    goal.current.pos.set(...cameraPresets[preset].pos)
    goal.current.target.set(...cameraPresets[preset].target)
    goal.current.active = true
  }, [preset])

  useFrame((_, dt) => {
    const g = goal.current
    if (!g.active || !controls) return
    const k = 1 - Math.pow(0.0015, dt)
    camera.position.lerp(g.pos, k)
    controls.target.lerp(g.target, k)
    controls.update()
    if (camera.position.distanceTo(g.pos) < 0.01 && controls.target.distanceTo(g.target) < 0.01) g.active = false
  })

  useEffect(() => {
    if (!controls) return
    const stop = () => (goal.current.active = false)
    controls.addEventListener('start', stop)
    return () => controls.removeEventListener('start', stop)
  }, [controls])

  return null
}

function Block({
  x,
  y,
  w,
  h,
  z0,
  z1,
  color,
  edges = true,
  opacity,
  cast = true,
}: {
  x: number
  y: number
  w: number
  h: number
  z0: number
  z1: number
  color: string
  edges?: boolean
  opacity?: number
  cast?: boolean
}) {
  if (w <= 0.001 || h <= 0.001 || z1 - z0 <= 0.001) return null
  return (
    <mesh position={[x + w / 2, (z0 + z1) / 2, y + h / 2]} castShadow={cast} receiveShadow>
      <boxGeometry args={[w, z1 - z0, h]} />
      <meshStandardMaterial color={color} roughness={0.85} transparent={opacity !== undefined} opacity={opacity ?? 1} depthWrite={opacity === undefined} />
      {edges && <Edges color="#6b645c" threshold={20} />}
    </mesh>
  )
}

function splitByWindows(wall: Wall, windows: Window[]) {
  const horizontal = wall.w >= wall.h
  const a0 = horizontal ? wall.x : wall.y
  const a1 = horizontal ? wall.x + wall.w : wall.y + wall.h
  const cuts = windows
    .filter((win) => win.x < wall.x + wall.w - 1e-3 && win.x + win.w > wall.x + 1e-3 && win.y < wall.y + wall.h - 1e-3 && win.y + win.h > wall.y + 1e-3)
    .map((win) => ({
      s0: horizontal ? Math.max(a0, win.x) : Math.max(a0, win.y),
      s1: horizontal ? Math.min(a1, win.x + win.w) : Math.min(a1, win.y + win.h),
      sill: win.sill ?? (win.door ? 0 : SILL),
      head: win.head ?? HEAD,
    }))
    .sort((p, q) => p.s0 - q.s0)

  const solid: [number, number][] = []
  let cur = a0
  for (const c of cuts) {
    if (c.s0 > cur) solid.push([cur, c.s0])
    cur = Math.max(cur, c.s1)
  }
  if (cur < a1) solid.push([cur, a1])

  const rect = (s0: number, s1: number) => (horizontal ? { x: s0, y: wall.y, w: s1 - s0, h: wall.h } : { x: wall.x, y: s0, w: wall.w, h: s1 - s0 })
  return {
    solid: solid.map(([s0, s1]) => rect(s0, s1)),
    openings: cuts.map((c) => ({ ...rect(c.s0, c.s1), sill: c.sill, head: c.head })),
  }
}

function Glass({ r, bottom, top }: { r: Rect; bottom: number; top: number }) {
  const horizontal = r.w >= r.h
  const t = 0.03
  const gx = horizontal ? r.x : r.x + r.w / 2 - t / 2
  const gy = horizontal ? r.y + r.h / 2 - t / 2 : r.y
  return (
    <mesh position={[gx + (horizontal ? r.w : t) / 2, (bottom + top) / 2, gy + (horizontal ? t : r.h) / 2]}>
      <boxGeometry args={[horizontal ? r.w : t, top - bottom, horizontal ? t : r.h]} />
      <meshStandardMaterial color="#9fd3ea" transparent opacity={0.35} roughness={0.1} metalness={0.1} depthWrite={false} />
    </mesh>
  )
}

function Walls({ plan, top }: { plan: Plan; top: number }) {
  return (
    <group>
      {plan.walls.map((wall, i) => {
        const { solid, openings } = splitByWindows(wall, plan.windows)
        return (
          <group key={i}>
            {solid.map((r, j) => (
              <Block key={j} {...r} z0={0} z1={top} color="#f5f2ed" />
            ))}
            {openings.map(({ sill, head, ...r }, j) => (
              <group key={`o${j}`}>
                <Block {...r} z0={0} z1={Math.min(sill, top)} color="#f5f2ed" />
                <Block {...r} z0={head} z1={top} color="#f5f2ed" />
                {top > sill && <Glass r={r} bottom={sill} top={Math.min(head, top)} />}
              </group>
            ))}
          </group>
        )
      })}
      {plan.doors.map((d, i) => (
        <group key={`d${i}`}>
          <Block {...d.gap} z0={DOOR_H} z1={top} color="#f5f2ed" />
          <DoorLeaf d={d} />
        </group>
      ))}
    </group>
  )
}

function DoorLeaf({ d }: { d: Door }) {
  const g = d.gap
  const alongX = g.w >= g.h
  const t = 0.04
  if (alongX) return <Block x={g.x} y={g.y + g.h / 2 - t / 2} w={g.w} h={t} z0={0} z1={DOOR_H} color="#c4a574" />
  return <Block x={g.x + g.w / 2 - t / 2} y={g.y} w={t} h={g.h} z0={0} z1={DOOR_H} color="#c4a574" />
}

function Floors({ plan }: { plan: Plan }) {
  return (
    <group>
      {plan.rooms.map((room) => (
        <group key={room.id}>
          {room.rects.map((r, i) => (
            <Block key={i} {...r} z0={-0.04} z1={0} color={floorColor[room.tone]} edges={false} cast={false} />
          ))}
        </group>
      ))}
    </group>
  )
}

function Ceilings({ plan, height }: { plan: Plan; height: number }) {
  return (
    <group>
      {plan.rooms
        .filter((room) => room.tone !== 'outdoor')
        .map((room) =>
          room.rects.map((r, i) => <Block key={`${room.id}-${i}`} {...r} z0={height} z1={height + 0.04} color="#f7f4ee" edges={false} cast={false} />),
        )}
    </group>
  )
}

function strip(f: Furniture, side: Side, t: number): Rect {
  if (side === 'left') return { x: f.x, y: f.y, w: t, h: f.h }
  if (side === 'right') return { x: f.x + f.w - t, y: f.y, w: t, h: f.h }
  if (side === 'bottom') return { x: f.x, y: f.y + f.h - t, w: f.w, h: t }
  return { x: f.x, y: f.y, w: f.w, h: t }
}

function Furniture3D({ f, top }: { f: Furniture; top: number }) {
  switch (f.kind) {
    case 'bed': {
      const back = f.back ?? 'top'
      const pillows: Rect[] =
        back === 'left' || back === 'right'
          ? [
              { x: back === 'left' ? f.x + 0.08 : f.x + f.w - 0.43, y: f.y + 0.1, w: 0.35, h: f.h / 2 - 0.15 },
              { x: back === 'left' ? f.x + 0.08 : f.x + f.w - 0.43, y: f.y + f.h / 2 + 0.05, w: 0.35, h: f.h / 2 - 0.15 },
            ]
          : [
              { x: f.x + 0.1, y: back === 'top' ? f.y + 0.08 : f.y + f.h - 0.43, w: f.w / 2 - 0.15, h: 0.35 },
              { x: f.x + f.w / 2 + 0.05, y: back === 'top' ? f.y + 0.08 : f.y + f.h - 0.43, w: f.w / 2 - 0.15, h: 0.35 },
            ]
      return (
        <group>
          <Block {...f} z0={0} z1={0.5} color="#fbfaf7" />
          {pillows.map((p, i) => (
            <Block key={i} {...p} z0={0.5} z1={0.62} color="#ffffff" edges={false} />
          ))}
          <Block {...strip(f, back, 0.06)} z0={0} z1={1.05} color="#9c7a57" />
        </group>
      )
    }
    case 'nightstand':
      return <Block {...f} z0={0} z1={0.5} color="#a88360" />
    case 'wardrobe':
      return <Block {...f} z0={0} z1={Math.min(top, 2.2)} color="#e9dfd0" />
    case 'shower':
      return (
        <group>
          <Block {...f} z0={0} z1={0.03} color="#f8fafc" edges={false} />
          <Block {...f} z0={0.03} z1={Math.min(top, 2.0)} color="#bfe3f2" opacity={0.18} edges={false} cast={false} />
        </group>
      )
    case 'toilet':
      return <Block {...f} z0={0} z1={0.42} color="#ffffff" />
    case 'sink':
      return <Block {...f} z0={0} z1={0.86} color="#ffffff" />
    case 'counter':
      return <Block {...f} z0={0} z1={0.9} color="#d7c4a8" />
    case 'tall':
      return <Block {...f} z0={0} z1={1.85} color="#c9b79a" />
    case 'table':
      return (
        <group>
          <Block {...f} z0={0.72} z1={0.76} color="#a88360" />
          {chairs(f).map((c, i) => (
            <Block key={i} {...c} z0={0} z1={0.46} color="#7c8b6f" />
          ))}
        </group>
      )
    case 'sofa': {
      const back = f.back ?? 'left'
      const across = back === 'left' || back === 'right'
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
        <group>
          <Block {...f} z0={0} z1={0.42} color="#8a9a7b" />
          <Block {...strip(f, back, 0.18)} z0={0.42} z1={0.78} color="#7c8b6f" />
          {arms.map((r, i) => (
            <Block key={i} {...r} z0={0.42} z1={0.62} color="#7c8b6f" />
          ))}
        </group>
      )
    }
    case 'generic':
      return <Block {...f} z0={0} z1={f.height ?? 0.5} color="#b08d68" />
    default:
      return null
  }
}

function Scene({ plan, showFurniture, cutWalls }: Props) {
  const ceiling = plan.ceiling
  const top = cutWalls ? 1.6 : ceiling
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[7, -0.05, 4]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#e7e2d8" roughness={1} />
      </mesh>
      <Floors plan={plan} />
      {!cutWalls && <Ceilings plan={plan} height={ceiling} />}
      <Walls plan={plan} top={top} />
      {showFurniture && plan.furniture.filter((f) => !f.only2d).map((f, i) => <Furniture3D key={i} f={f} top={top} />)}
    </group>
  )
}
