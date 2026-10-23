'use client'

import { useActionState } from 'react'
import { createClientAccess } from '@/lib/actions/client-access'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Props {
  customers: { id: string; name: string; contact_email: string | null }[]
}

export function ClientAccessForm({ customers }: Props) {
  const [state, action, pending] = useActionState(createClientAccess, {})

  return (
    <div className="space-y-4">
      <form action={action} className="grid max-w-xl gap-4 rounded-lg border bg-card p-4">
        <div className="grid gap-1.5">
          <Label htmlFor="customer_id">Cliente *</Label>
          <select
            id="customer_id"
            name="customer_id"
            required
            defaultValue=""
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            <option value="" disabled>Seleccionar cliente</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="email">Correo electrónico del cliente *</Label>
          <Input id="email" name="email" type="email" required placeholder="cliente@empresa.com" />
          <p className="text-xs text-muted-foreground">
            Si el correo ya tiene acceso, se generan credenciales temporales nuevas.
          </p>
        </div>

        {state.error && (
          <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{state.error}</p>
        )}

        <div>
          <Button type="submit" disabled={pending}>
            {pending ? 'Generando…' : 'Generar acceso temporal'}
          </Button>
        </div>
      </form>

      {state.success && (
        <div className="max-w-xl space-y-2 rounded-lg border border-green-300 bg-green-50 p-4 text-sm">
          <p className="font-medium text-green-900">Acceso generado (vence en 1 hora)</p>
          <p>
            Usuario: <span className="font-mono">{state.success.email}</span>
          </p>
          <p>
            Contraseña temporal: <span className="font-mono">{state.success.password}</span>
          </p>
          <p className="text-xs text-green-900/80">
            Vence: {new Date(state.success.expiresAt).toLocaleString('es-CO')}.{' '}
            {state.success.emailed
              ? 'Se envió también por correo al cliente.'
              : 'No se envió correo automático: entregue estas credenciales al cliente. Esta contraseña no se volverá a mostrar.'}
          </p>
        </div>
      )}
    </div>
  )
}
