import { PointerLockControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { cameraPresets, type CameraPreset } from './cameraPresets'
import type { Plan, Rect, Wall } from '@/plan/types'

const EYE = 1.6
const RADIUS = 0.22
const SPEED = 2.4
const SPRINT = 4.2

function contains(r: Rect, x: number, y: number, pad = 0) {
  return x >= r.x - pad && x <= r.x + r.w + pad && y >= r.y - pad && y <= r.y + r.h + pad
}

function inGap(gaps: Rect[], x: number, z: number) {
  return gaps.some((g) => contains(g, x, z, 0.06))
}

function insideRooms(plan: Plan, x: number, z: number) {
  return plan.rooms.some((room) => room.tone !== 'outdoor' && room.rects.some((r) => contains(r, x, z, 0.08)))
}

function collide(x: number, z: number, walls: Wall[], gaps: Rect[]) {
  let px = x
  let pz = z
  for (const w of walls) {
    if (inGap(gaps, px, pz)) continue
    const nearestX = Math.min(Math.max(px, w.x), w.x + w.w)
    const nearestZ = Math.min(Math.max(pz, w.y), w.y + w.h)
    const dx = px - nearestX
    const dz = pz - nearestZ
    const d2 = dx * dx + dz * dz
    if (d2 >= RADIUS * RADIUS) continue
    if (d2 < 1e-8) {
      const left = px - w.x
      const right = w.x + w.w - px
      const top = pz - w.y
      const bottom = w.y + w.h - pz
      const m = Math.min(left, right, top, bottom)
      if (m === left) px = w.x - RADIUS
      else if (m === right) px = w.x + w.w + RADIUS
      else if (m === top) pz = w.y - RADIUS
      else pz = w.y + w.h + RADIUS
      continue
    }
    const d = Math.sqrt(d2)
    px = nearestX + (dx / d) * RADIUS
    pz = nearestZ + (dz / d) * RADIUS
  }
  return { x: px, z: pz }
}

function spawnFor(preset: CameraPreset, plan: Plan) {
  const { room: id, target } = cameraPresets[preset]
  const room = plan.rooms.find((r) => r.id === id) ?? plan.rooms[0]
  return { x: room.label.x, z: room.label.y, lookX: target[0], lookZ: target[2] }
}

export function WalkControls({ plan, preset }: { plan: Plan; preset: CameraPreset }) {
  const { camera } = useThree()
  const cam = camera as THREE.PerspectiveCamera
  const keys = useRef(new Set<string>())
  const last = useRef({ x: 0, z: 0 })
  const gaps = useMemo(() => plan.doors.map((d) => d.gap), [plan.doors])

  useEffect(() => {
    const on = (e: KeyboardEvent) => keys.current.add(e.code)
    const off = (e: KeyboardEvent) => keys.current.delete(e.code)
    window.addEventListener('keydown', on)
    window.addEventListener('keyup', off)
    return () => {
      window.removeEventListener('keydown', on)
      window.removeEventListener('keyup', off)
    }
  }, [])

  useEffect(() => {
    const s = spawnFor(preset, plan)
    last.current = { x: s.x, z: s.z }
    cam.position.set(s.x, EYE, s.z)
    cam.lookAt(s.lookX, EYE, s.lookZ)
    cam.fov = 68
    cam.updateProjectionMatrix()
  }, [preset, plan, cam])

  useFrame((_, dt) => {
    const k = keys.current
    const forward = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0)
    const right = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0)
    if (!forward && !right) return
    const speed = (k.has('ShiftLeft') || k.has('ShiftRight') ? SPRINT : SPEED) * Math.min(dt, 0.05)
    const front = new THREE.Vector3()
    cam.getWorldDirection(front)
    front.y = 0
    if (front.lengthSq() < 1e-6) front.set(0, 0, 1)
    front.normalize()
    const side = new THREE.Vector3().crossVectors(front, camera.up).normalize()
    let x = cam.position.x + front.x * forward * speed + side.x * right * speed
    let z = cam.position.z + front.z * forward * speed + side.z * right * speed
    const hit = collide(x, z, plan.walls, gaps)
    x = hit.x
    z = hit.z
    if (!insideRooms(plan, x, z) && !inGap(gaps, x, z)) {
      x = last.current.x
      z = last.current.z
    } else {
      last.current = { x, z }
    }
    cam.position.set(x, EYE, z)
  })

  return <PointerLockControls makeDefault />
}
