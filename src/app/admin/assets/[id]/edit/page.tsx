import { notFound } from 'next/navigation'
import { createServiceClient as createClient } from '@/lib/supabase/server'
import { AssetForm } from '@/components/assets/asset-form'
import { updateAsset } from '@/lib/actions/assets'
import type { Asset, Customer, Location } from '@/lib/database.types'

export default async function EditAssetPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: asset } = await supabase.from('assets').select('*').eq('id', id).single()
  const [{ data: customers }, { data: locations }] = await Promise.all([
    supabase.from('customers').select('id, name').order('name'),
    supabase.from('locations').select('id, name, customer_id').order('name'),
  ])

  if (!asset) notFound()

  const typedAsset = asset as Asset
  const action = updateAsset.bind(null, id)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Editar Activo</h1>
        <p className="text-sm text-muted-foreground font-mono">{typedAsset.tag}</p>
      </div>
      <AssetForm
        action={action}
        defaultValues={typedAsset}
        customers={(customers ?? []) as Pick<Customer, 'id' | 'name'>[]}
        locations={(locations ?? []) as Pick<Location, 'id' | 'name' | 'customer_id'>[]}
        submitLabel="Actualizar Activo"
      />
    </div>
  )
}
