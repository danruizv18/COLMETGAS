import { Wrench } from 'lucide-react'

export default function EquipmentPage() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <Wrench className="h-12 w-12 text-muted-foreground mb-4" />
      <h1 className="text-2xl font-bold tracking-tight">Equipos</h1>
      <p className="text-muted-foreground mt-2">Próximamente</p>
    </div>
  )
}
