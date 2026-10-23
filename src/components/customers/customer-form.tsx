'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { Customer } from '@/lib/database.types'
import type { CustomerFormState } from '@/lib/actions/customers'

interface Props {
  action: (prev: CustomerFormState, data: FormData) => Promise<CustomerFormState>
  defaultValues?: Partial<Customer>
  submitLabel?: string
}

export function CustomerForm({ action, defaultValues, submitLabel = 'Guardar' }: Props) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(action, {})

  useEffect(() => {
    if (state.message === 'ok') router.push('/admin/customers')
  }, [state.message, router])

  const field = (name: keyof Customer) => ({
    name,
    id: name,
    defaultValue: defaultValues?.[name] as string | undefined,
  })

  return (
    <form action={formAction} className="space-y-4 max-w-xl">
      {state.message && state.message !== 'ok' && (
        <p className="text-sm text-destructive rounded-md bg-destructive/10 p-3">{state.message}</p>
      )}

      <div className="grid gap-1.5">
        <Label htmlFor="name">Razón Social *</Label>
        <Input {...field('name')} placeholder="Distribuidora GLP del Valle S.A.S." />
        {state.errors?.name && <p className="text-xs text-destructive">{state.errors.name[0]}</p>}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="tax_id">NIT *</Label>
        <Input {...field('tax_id')} placeholder="900123456-1" />
        {state.errors?.tax_id && <p className="text-xs text-destructive">{state.errors.tax_id[0]}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="contact_name">Contacto</Label>
          <Input {...field('contact_name')} placeholder="Nombre del contacto" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="contact_phone">Teléfono</Label>
          <Input {...field('contact_phone')} placeholder="300 000 0000" />
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="contact_email">Email</Label>
        <Input {...field('contact_email')} type="email" placeholder="contacto@empresa.com" />
        {state.errors?.contact_email && (
          <p className="text-xs text-destructive">{state.errors.contact_email[0]}</p>
        )}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="notes">Notas</Label>
        <Textarea {...field('notes')} rows={3} placeholder="Observaciones adicionales" />
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? 'Guardando...' : submitLabel}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
