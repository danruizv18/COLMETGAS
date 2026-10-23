import { HardHat } from 'lucide-react'

export default function PersonnelPage() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <HardHat className="h-12 w-12 text-muted-foreground mb-4" />
      <h1 className="text-2xl font-bold tracking-tight">Personal</h1>
      <p className="text-muted-foreground mt-2">Próximamente</p>
    </div>
  )
}
