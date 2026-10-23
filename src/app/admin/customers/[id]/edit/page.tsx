import { notFound } from 'next/navigation'
import { createServiceClient as createClient } from '@/lib/supabase/server'
import { CustomerForm } from '@/components/customers/customer-form'
import { updateCustomer } from '@/lib/actions/customers'
import type { Customer } from '@/lib/database.types'

export const dynamic = 'force-dynamic'

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: raw } = await supabase.from('customers').select('*').eq('id', id).single()
  const customer = raw as Customer | null

  if (!customer) notFound()

  const action = updateCustomer.bind(null, id)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Editar Cliente</h1>
        <p className="text-sm text-muted-foreground">{customer.name}</p>
      </div>
      <CustomerForm action={action} defaultValues={customer} submitLabel="Actualizar Cliente" />
    </div>
  )
}
