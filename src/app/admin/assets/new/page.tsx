import { createServiceClient as createClient } from '@/lib/supabase/server'
import { AssetForm } from '@/components/assets/asset-form'
import { createAsset } from '@/lib/actions/assets'

export default async function NewAssetPage() {
  const supabase = await createClient()
  const [{ data: customers }, { data: locations }] = await Promise.all([
    supabase.from('customers').select('id, name').order('name'),
    supabase.from('locations').select('id, name, customer_id').order('name'),
  ])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Nuevo Activo</h1>
        <p className="text-sm text-muted-foreground">Registrar activo en el sistema</p>
      </div>
      <AssetForm
        action={createAsset}
        customers={customers ?? []}
        locations={locations ?? []}
        submitLabel="Crear Activo"
      />
    </div>
  )
}
