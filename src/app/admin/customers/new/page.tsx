import { CustomerForm } from '@/components/customers/customer-form'
import { createCustomer } from '@/lib/actions/customers'

export default function NewCustomerPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Nuevo Cliente</h1>
        <p className="text-sm text-muted-foreground">Registrar empresa cliente</p>
      </div>
      <CustomerForm action={createCustomer} submitLabel="Crear Cliente" />
    </div>
  )
}
