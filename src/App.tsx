import { Suspense, lazy, useState } from 'react'
import { cameraPresets, type CameraPreset } from '@/components/cameraPresets'
import { FloorPlan } from '@/components/FloorPlan'
import { Toggle } from '@/components/Toggle'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { house } from '@/plan/house'
import type { Plan } from '@/plan/types'

const House3D = lazy(() => import('@/components/House3D'))
const params = new URLSearchParams(window.location.search)
const fmt = (v: number) => v.toFixed(2).replace('.', ',')
const interior = house.rooms.filter((r) => r.tone !== 'outdoor')
const interiorArea = interior.reduce((s, r) => s + r.area, 0)

export default function App() {
  const [showFurniture, setShowFurniture] = useState(params.get('mob') !== '0')
  const [showDims, setShowDims] = useState(true)
  const [hovered, setHovered] = useState<string | null>(null)
  const [tab, setTab] = useState<string>(params.get('tab') ?? '3d')
  const [preset, setPreset] = useState<CameraPreset>((params.get('cam') as CameraPreset) ?? 'geral')
  const [walk, setWalk] = useState(params.get('walk') === '1')
  const [cutWalls, setCutWalls] = useState(params.get('cut') === '1')
  const [showLabels, setShowLabels] = useState(params.get('labels') !== '0')
  const hoveredRoom = hovered ? (house.rooms.find((r) => r.id === hovered) ?? null) : null

  return (
    <div className="min-h-screen bg-[#faf9f6] text-stone-900">
      <header className="border-b border-stone-200 bg-white/70 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:py-6">
          <p className="text-xs font-medium tracking-[0.18em] text-stone-500 uppercase">Casa nova · R/C</p>
          <h1 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">Planta e 3D</h1>
          <p className="mt-1 max-w-2xl text-sm text-stone-600">
            Medidas interiores a partir do esboço: 14 × 6 m por dentro das paredes. Norte à esquerda; poente em baixo.
          </p>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:py-8">
        <section className="min-w-0">
          <Card className="overflow-hidden py-0">
            <Tabs
              value={tab}
              onValueChange={(v) => {
                if (v) {
                  setTab(v)
                  setHovered(null)
                }
              }}
            >
              <div className="flex flex-col gap-3 border-b border-stone-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <TabsList>
                  <TabsTrigger value="3d">3D</TabsTrigger>
                  <TabsTrigger value="planta">Planta</TabsTrigger>
                </TabsList>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                  <Toggle label="Mobiliário" checked={showFurniture} onChange={setShowFurniture} />
                  {tab === '3d' ? (
                    <>
                      <Toggle label="Passear" checked={walk} onChange={setWalk} />
                      <Toggle label="Nomes" checked={showLabels} onChange={setShowLabels} />
                      <Toggle label="Cortar paredes" checked={cutWalls} onChange={setCutWalls} disabled={walk} />
                    </>
                  ) : (
                    <Toggle label="Cotas" checked={showDims} onChange={setShowDims} />
                  )}
                </div>
              </div>

              {tab !== '3d' && <RoomInfo room={hoveredRoom} />}

              <TabsContent value="3d" className="pb-3">
                <div className="flex flex-wrap items-center gap-2 border-b border-stone-100 bg-stone-50/60 px-4 py-2.5">
                  {(Object.keys(cameraPresets) as CameraPreset[]).map((k) => (
                    <button
                      key={k}
                      onClick={() => setPreset(k)}
                      className={`rounded-full px-3 py-1 text-sm transition ${preset === k ? 'bg-stone-200 font-medium text-stone-900' : 'text-stone-600 hover:bg-stone-100'}`}
                    >
                      {cameraPresets[k].label}
                    </button>
                  ))}
                </div>
                <div className="relative h-[62vh] min-h-[380px] w-full">
                  <Suspense fallback={<div className="flex h-full items-center justify-center text-sm text-stone-500">A carregar o modelo 3D…</div>}>
                    <House3D
                      plan={house}
                      preset={preset}
                      showFurniture={showFurniture}
                      showLabels={showLabels}
                      cutWalls={walk ? false : cutWalls}
                      walk={walk}
                    />
                  </Suspense>
                  <p className="pointer-events-none absolute bottom-2 left-3 z-20 rounded bg-white/85 px-2 py-1 text-xs text-stone-600">
                    {walk
                      ? 'Clique para entrar · W A S D para andar · rato para olhar · Esc para soltar o rato · Shift para acelerar'
                      : 'Arrastar para rodar · roda do rato para aproximar · botão direito para deslocar · «Passear» para andar lá dentro'}
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="planta" className="px-2 pb-3 sm:px-4">
                <FloorPlan plan={house} showFurniture={showFurniture} showDims={showDims} hovered={hovered} onHover={setHovered} />
              </TabsContent>
            </Tabs>
          </Card>
        </section>

        <aside>
          <Card>
            <CardHeader>
              <CardTitle>Divisões</CardTitle>
              <CardDescription>
                {fmt(interiorArea)} m² úteis no interior
                {house.rooms
                  .filter((r) => r.tone === 'outdoor')
                  .map((r) => ` · ${r.name} ${fmt(r.area)} m²`)
                  .join('')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-1 pb-4">
              {house.rooms.map((room) => (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => setHovered(room.id === hovered ? null : room.id)}
                  onMouseEnter={() => setHovered(room.id)}
                  onMouseLeave={() => setHovered(null)}
                  className={`flex w-full items-baseline justify-between gap-3 rounded-md px-2 py-1.5 text-left text-sm transition ${hovered === room.id ? 'bg-stone-100' : 'hover:bg-stone-50'}`}
                >
                  <span className="font-medium">{room.name}</span>
                  <span className="tabular-nums text-stone-500">{fmt(room.area)} m²</span>
                </button>
              ))}
            </CardContent>
          </Card>
        </aside>
      </main>

      <footer className="mx-auto max-w-7xl px-4 pb-10 text-xs text-stone-500 sm:px-6">
        Estudo a partir do esboço. Não substitui o projeto de arquitetura.
      </footer>
    </div>
  )
}

function RoomInfo({ room }: { room: Plan['rooms'][number] | null }) {
  return (
    <div className="min-h-[68px] border-b border-stone-100 bg-stone-50/60 px-4 py-3 text-sm">
      {room ? (
        <div>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-semibold">{room.name}</span>
            <Badge variant="secondary" className="tabular-nums">
              {fmt(room.area)} m²
            </Badge>
            {room.dims && <span className="text-xs text-stone-500">{room.dims} m</span>}
          </div>
          {room.note && <p className="mt-1 text-stone-600">{room.note}</p>}
        </div>
      ) : (
        <p className="text-stone-500">Passe o rato (ou toque) numa divisão para ver a área, as medidas e o raciocínio.</p>
      )}
    </div>
  )
}
