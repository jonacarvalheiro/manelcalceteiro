export type CameraPreset = 'geral' | 'sala' | 'quartos' | 'wc' | 'topo'

/** Coordenadas do 3D: x e z são o x e o y da planta, y é a altura. `room` é a divisão onde se começa a passear. */
export const cameraPresets: Record<CameraPreset, { label: string; pos: [number, number, number]; target: [number, number, number]; room: string }> = {
  geral: { label: 'Vista geral', pos: [11.5, 10.5, 16.5], target: [7, 0, 3.4], room: 'sala' },
  sala: { label: 'Salão e cozinha', pos: [-3.8, 8.2, 10], target: [3.4, 0.2, 3], room: 'sala' },
  quartos: { label: 'Quartos', pos: [10.8, 9.2, 13.4], target: [10.8, 0.2, 3.6], room: 'corredor' },
  wc: { label: 'WC e corredor', pos: [6.2, 8.6, -5], target: [9.2, 0.2, 1.9], room: 'corredor' },
  topo: { label: 'Planta', pos: [7, 18, 3.66], target: [7, 0, 3.6], room: 'sala' },
}
