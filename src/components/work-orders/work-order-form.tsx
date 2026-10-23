'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { WorkOrder, Customer } from '@/lib/database.types'
import type { WorkOrderFormState } from '@/lib/actions/work-orders'

interface Props {
  action: (prev: WorkOrderFormState, data: FormData) => Promise<WorkOrderFormState>
  defaultValues?: Partial<WorkOrder>
  customers: Pick<Customer, 'id' | 'name'>[]
  submitLabel?: string
}

const WO_TYPE_LABELS = {
  maintenance: 'Mantenimiento',
  installation: 'Instalación',
  manufacture: 'Fabricación ASME',
  fabrication: 'Fabricación Estructural',
}

const WO_STATUS_LABELS = {
  draft: 'Borrador',
  in_progress: 'En Ejecución',
  completed: 'Completada',
  cancelled: 'Cancelada',
}

export function WorkOrderForm({ action, defaultValues, customers, submitLabel = 'Guardar' }: Props) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(action, {})

  useEffect(() => {
    if (state.message === 'ok') router.push('/admin/work-orders')
  }, [state.message, router])

  return (
    <form action={formAction} className="space-y-4 max-w-2xl">
      {state.message && state.message !== 'ok' && (
        <p className="text-sm text-destructive rounded-md bg-destructive/10 p-3">{state.message}</p>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="wo_number">Número de OT *</Label>
          <Input
            name="wo_number"
            id="wo_number"
            defaultValue={defaultValues?.wo_number}
            placeholder="OT-2026-001"
          />
          {state.errors?.wo_number && (
            <p className="text-xs text-destructive">{state.errors.wo_number[0]}</p>
          )}
        </div>

        <div className="grid gap-1.5">
          <Label>Tipo *</Label>
          <Select name="wo_type" defaultValue={defaultValues?.wo_type ?? 'maintenance'}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(WO_TYPE_LABELS).map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {state.errors?.wo_type && (
            <p className="text-xs text-destructive">{state.errors.wo_type[0]}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-1.5">
          <Label>Cliente *</Label>
          <Select name="customer_id" defaultValue={defaultValues?.customer_id}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar cliente" />
            </SelectTrigger>
            <SelectContent>
              {customers.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {state.errors?.customer_id && (
            <p className="text-xs text-destructive">{state.errors.customer_id[0]}</p>
          )}
        </div>

        <div className="grid gap-1.5">
          <Label>Estado</Label>
          <Select name="status" defaultValue={defaultValues?.status ?? 'draft'}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(WO_STATUS_LABELS).map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="start_date">Fecha Inicio</Label>
          <Input
            name="start_date"
            id="start_date"
            type="date"
            defaultValue={defaultValues?.start_date ?? ''}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="end_date">Fecha Fin</Label>
          <Input
            name="end_date"
            id="end_date"
            type="date"
            defaultValue={defaultValues?.end_date ?? ''}
          />
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="notes">Notas</Label>
        <Textarea
          name="notes"
          id="notes"
          rows={3}
          defaultValue={defaultValues?.notes ?? ''}
          placeholder="Descripción del trabajo, alcance, observaciones..."
        />
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
