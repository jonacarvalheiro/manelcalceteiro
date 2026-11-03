import { Switch } from '@/components/ui/switch'

export function Toggle({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className={`flex items-center gap-2 ${disabled ? 'opacity-40' : 'cursor-pointer'}`}>
      <Switch checked={checked} onCheckedChange={(v) => onChange(v)} disabled={disabled} />
      <span>{label}</span>
    </label>
  )
}
