import { notFound } from 'next/navigation'
import { createServiceClient as createClient } from '@/lib/supabase/server'
import { MaterialForm } from '@/components/materials/material-form'
import { updateMaterial } from '@/lib/actions/materials'
import type { Material, MaterialCategory } from '@/lib/database.types'

export default async function EditMaterialPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const [{ data: rawMaterial }, { data: rawCategories }] = await Promise.all([
    supabase.from('materials').select('*').eq('id', id).single(),
    supabase.from('material_categories').select('id, name').order('name'),
  ])

  if (!rawMaterial) notFound()

  const material = rawMaterial as Material
  const categories = (rawCategories ?? []) as Pick<MaterialCategory, 'id' | 'name'>[]
  const action = updateMaterial.bind(null, id)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Editar Material</h1>
        <p className="text-sm text-muted-foreground font-mono">{material.description}</p>
      </div>
      <MaterialForm
        action={action}
        defaultValues={material}
        categories={categories}
        submitLabel="Actualizar Material"
      />
    </div>
  )
}
