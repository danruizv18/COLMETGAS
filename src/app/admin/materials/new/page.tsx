import { createServiceClient as createClient } from '@/lib/supabase/server'
import { MaterialForm } from '@/components/materials/material-form'
import { createMaterial } from '@/lib/actions/materials'
import type { MaterialCategory } from '@/lib/database.types'

export default async function NewMaterialPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const { data } = await supabase.from('material_categories').select('id, name').order('name')
  const categories = (data ?? []) as Pick<MaterialCategory, 'id' | 'name'>[]

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Nuevo Material</h1>
        <p className="text-sm text-muted-foreground">Agrega un material al catálogo</p>
      </div>
      <MaterialForm action={createMaterial} categories={categories} />
    </div>
  )
}
