'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ConsumptionFormState } from '@/lib/actions/materials'

export interface BatchOption {
  id: string
  batch_number: string
  heat_number: string | null
  material_id: string
  material_description: string
  unit_of_measure: string
  available: number
}

interface MaterialOption {
  id: string
  description: string
}

interface Props {
  action: (prev: ConsumptionFormState, data: FormData) => Promise<ConsumptionFormState>
  batches: BatchOption[]
}

export function ConsumptionForm({ action, batches }: Props) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(action, {})
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('')
  const [selectedBatchId, setSelectedBatchId] = useState<string>('')

  useEffect(() => {
    if (state.message === 'ok') {
      router.refresh()
      setSelectedMaterialId('')
      setSelectedBatchId('')
    }
  }, [state.message, router])

  const materials: MaterialOption[] = Array.from(
    new Map(batches.map((b) => [b.material_id, { id: b.material_id, description: b.material_description }])).values()
  )

  const filteredBatches = selectedMaterialId
    ? batches.filter((b) => b.material_id === selectedMaterialId)
    : batches

  const selectedBatch = batches.find((b) => b.id === selectedBatchId)

  return (
    <form action={formAction} className="space-y-4">
      {state.message && state.message !== 'ok' && (
        <p className="text-sm text-destructive rounded-md bg-destructive/10 p-3">{state.message}</p>
      )}
      {state.message === 'ok' && (
        <p className="text-sm text-green-600 rounded-md bg-green-50 p-3">Consumo registrado.</p>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-1.5">
          <Label>Material</Label>
          <Select
            value={selectedMaterialId}
            onValueChange={(v) => { setSelectedMaterialId(v ?? ''); setSelectedBatchId('') }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por material" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              {materials.map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.description}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1.5">
          <Label>Lote *</Label>
          <Select
            name="batch_id"
            value={selectedBatchId}
            onValueChange={(v) => setSelectedBatchId(v ?? '')}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar lote" />
            </SelectTrigger>
            <SelectContent>
              {filteredBatches.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.batch_number}
                  {b.heat_number ? ` · ${b.heat_number}` : ''}
                  {' '}— Disp: {b.available} {b.unit_of_measure}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {state.errors?.batch_id && (
            <p className="text-xs text-destructive">{state.errors.batch_id[0]}</p>
          )}
        </div>
      </div>

      {selectedBatch && (
        <p className="text-xs text-muted-foreground">
          Disponible en lote: <strong>{selectedBatch.available} {selectedBatch.unit_of_measure}</strong>
        </p>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="quantity_used">Cantidad Consumida *</Label>
          <Input
            name="quantity_used"
            id="quantity_used"
            type="number"
            step="0.001"
            min="0.001"
            max={selectedBatch?.available}
            placeholder="0.000"
          />
          {state.errors?.quantity_used && (
            <p className="text-xs text-destructive">{state.errors.quantity_used[0]}</p>
          )}
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="used_date">Fecha de Uso *</Label>
          <Input name="used_date" id="used_date" type="date" />
          {state.errors?.used_date && (
            <p className="text-xs text-destructive">{state.errors.used_date[0]}</p>
          )}
        </div>
      </div>

      <Button type="submit" disabled={pending || !selectedBatchId}>
        {pending ? 'Registrando...' : 'Registrar Consumo'}
      </Button>
    </form>
  )
}
