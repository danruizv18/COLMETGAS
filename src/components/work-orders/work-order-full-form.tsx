'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2 } from 'lucide-react'
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
import type { WorkOrderFullState } from '@/lib/actions/work-order-full'
import { expensesTotal, formatCOP, materialsTotal, workersTotal } from '@/lib/work-orders/costs'

type MaterialRow = { description: string; unit: string; quantity: string; unit_price: string }
type ExpenseRow = { description: string; amount: string }
type WorkerRow = { worker_name: string; personnel_id: string | null; days_worked: string; daily_rate: string }

export type InitialLines = {
  materials: MaterialRow[]
  expenses: ExpenseRow[]
  workers: WorkerRow[]
}

interface Props {
  action: (prev: WorkOrderFullState, data: FormData) => Promise<WorkOrderFullState>
  defaultValues?: Partial<WorkOrder> & { incident_report?: string | null }
  customers: Pick<Customer, 'id' | 'name'>[]
  personnel: { id: string; full_name: string }[]
  initial?: InitialLines
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

const num = (v: string) => (Number.isFinite(Number(v)) ? Number(v) : 0)

export function WorkOrderFullForm({
  action,
  defaultValues,
  customers,
  personnel,
  initial,
  submitLabel = 'Guardar',
}: Props) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(action, {})

  const [materials, setMaterials] = useState<MaterialRow[]>(initial?.materials ?? [])
  const [expenses, setExpenses] = useState<ExpenseRow[]>(initial?.expenses ?? [])
  const [workers, setWorkers] = useState<WorkerRow[]>(initial?.workers ?? [])

  useEffect(() => {
    if (state.message === 'ok') router.push('/admin/wo-materials')
  }, [state.message, router])

  const matTotal = materialsTotal(
    materials.map((m) => ({ quantity: num(m.quantity), unit_price: num(m.unit_price) })),
  )
  const expTotal = expensesTotal(expenses.map((e) => ({ amount: num(e.amount) })))
  const workTotal = workersTotal(
    workers.map((w) => ({ days_worked: num(w.days_worked), daily_rate: num(w.daily_rate) })),
  )

  // Solo se envían renglones con descripción / nombre; los vacíos se ignoran.
  const payload = JSON.stringify({
    materials: materials
      .filter((m) => m.description.trim())
      .map((m) => ({ ...m, quantity: num(m.quantity), unit_price: num(m.unit_price) })),
    expenses: expenses
      .filter((e) => e.description.trim())
      .map((e) => ({ ...e, amount: num(e.amount) })),
    workers: workers
      .filter((w) => w.worker_name.trim())
      .map((w) => ({ ...w, days_worked: num(w.days_worked), daily_rate: num(w.daily_rate) })),
  })

  function patch<T>(setter: React.Dispatch<React.SetStateAction<T[]>>, i: number, p: Partial<T>) {
    setter((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...p } : r)))
  }
  function remove<T>(setter: React.Dispatch<React.SetStateAction<T[]>>, i: number) {
    setter((rows) => rows.filter((_, idx) => idx !== i))
  }

  return (
    <form action={formAction} className="max-w-4xl space-y-6">
      <input type="hidden" name="payload" value={payload} />

      {state.message && state.message !== 'ok' && (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{state.message}</p>
      )}

      {/* ── Datos generales ───────────────────────────── */}
      <section className="space-y-4 rounded-lg border bg-card p-4">
        <h2 className="text-base font-semibold">Datos de la orden</h2>

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
            <Input name="start_date" id="start_date" type="date" defaultValue={defaultValues?.start_date ?? ''} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="end_date">Fecha Fin</Label>
            <Input name="end_date" id="end_date" type="date" defaultValue={defaultValues?.end_date ?? ''} />
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="notes">Descripción del trabajo</Label>
          <Textarea
            name="notes"
            id="notes"
            rows={3}
            defaultValue={defaultValues?.notes ?? ''}
            placeholder="Descripción del trabajo, alcance, observaciones..."
          />
        </div>
      </section>

      {/* ── Materiales ────────────────────────────────── */}
      <section className="space-y-3 rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Materiales usados</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setMaterials((r) => [...r, { description: '', unit: '', quantity: '1', unit_price: '0' }])
            }
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> Agregar material
          </Button>
        </div>

        {materials.length === 0 && (
          <p className="text-sm text-muted-foreground">Sin materiales agregados.</p>
        )}

        {materials.map((m, i) => (
          <div key={i} className="grid grid-cols-12 items-end gap-2">
            <div className="col-span-4 grid gap-1">
              <Label className="text-xs">Material</Label>
              <Input value={m.description} onChange={(e) => patch(setMaterials, i, { description: e.target.value })} />
            </div>
            <div className="col-span-2 grid gap-1">
              <Label className="text-xs">Unidad</Label>
              <Input value={m.unit} placeholder="m, kg, un…" onChange={(e) => patch(setMaterials, i, { unit: e.target.value })} />
            </div>
            <div className="col-span-2 grid gap-1">
              <Label className="text-xs">Cantidad</Label>
              <Input type="number" min="0" step="0.001" value={m.quantity} onChange={(e) => patch(setMaterials, i, { quantity: e.target.value })} />
            </div>
            <div className="col-span-2 grid gap-1">
              <Label className="text-xs">Precio unitario</Label>
              <Input type="number" min="0" step="0.01" value={m.unit_price} onChange={(e) => patch(setMaterials, i, { unit_price: e.target.value })} />
            </div>
            <div className="col-span-1 pb-1.5 text-right text-xs font-mono">
              {formatCOP(num(m.quantity) * num(m.unit_price))}
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={() => remove(setMaterials, i)} aria-label="Quitar material">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}

        <p className="text-right text-sm font-medium">Total materiales: {formatCOP(matTotal)}</p>
      </section>

      {/* ── Viáticos ──────────────────────────────────── */}
      <section className="space-y-3 rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Viáticos</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setExpenses((r) => [...r, { description: '', amount: '0' }])}
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> Agregar viático
          </Button>
        </div>

        {expenses.length === 0 && (
          <p className="text-sm text-muted-foreground">Sin viáticos agregados.</p>
        )}

        {expenses.map((e, i) => (
          <div key={i} className="grid grid-cols-12 items-end gap-2">
            <div className="col-span-7 grid gap-1">
              <Label className="text-xs">Concepto</Label>
              <Input value={e.description} placeholder="Transporte, alimentación, hospedaje…" onChange={(ev) => patch(setExpenses, i, { description: ev.target.value })} />
            </div>
            <div className="col-span-4 grid gap-1">
              <Label className="text-xs">Valor</Label>
              <Input type="number" min="0" step="0.01" value={e.amount} onChange={(ev) => patch(setExpenses, i, { amount: ev.target.value })} />
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={() => remove(setExpenses, i)} aria-label="Quitar viático">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}

        <p className="text-right text-sm font-medium">Total viáticos: {formatCOP(expTotal)}</p>
      </section>

      {/* ── Personal ──────────────────────────────────── */}
      <section className="space-y-3 rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Personal (días trabajados)</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setWorkers((r) => [...r, { worker_name: '', personnel_id: null, days_worked: '1', daily_rate: '0' }])
            }
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> Agregar trabajador
          </Button>
        </div>

        <datalist id="personnel-names">
          {personnel.map((p) => (
            <option key={p.id} value={p.full_name} />
          ))}
        </datalist>

        {workers.length === 0 && (
          <p className="text-sm text-muted-foreground">Sin trabajadores agregados.</p>
        )}

        {workers.map((w, i) => (
          <div key={i} className="grid grid-cols-12 items-end gap-2">
            <div className="col-span-5 grid gap-1">
              <Label className="text-xs">Trabajador</Label>
              <Input
                list="personnel-names"
                value={w.worker_name}
                onChange={(e) => {
                  const match = personnel.find((p) => p.full_name === e.target.value)
                  patch(setWorkers, i, { worker_name: e.target.value, personnel_id: match?.id ?? null })
                }}
              />
            </div>
            <div className="col-span-2 grid gap-1">
              <Label className="text-xs">Días</Label>
              <Input type="number" min="0" step="0.5" value={w.days_worked} onChange={(e) => patch(setWorkers, i, { days_worked: e.target.value })} />
            </div>
            <div className="col-span-2 grid gap-1">
              <Label className="text-xs">Pago por día</Label>
              <Input type="number" min="0" step="0.01" value={w.daily_rate} onChange={(e) => patch(setWorkers, i, { daily_rate: e.target.value })} />
            </div>
            <div className="col-span-2 pb-1.5 text-right text-xs font-mono">
              {formatCOP(num(w.days_worked) * num(w.daily_rate))}
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={() => remove(setWorkers, i)} aria-label="Quitar trabajador">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}

        <p className="text-right text-sm font-medium">Total personal: {formatCOP(workTotal)}</p>
      </section>

      {/* ── Reporte ───────────────────────────────────── */}
      <section className="space-y-2 rounded-lg border bg-card p-4">
        <h2 className="text-base font-semibold">Reporte / imprevistos</h2>
        <Textarea
          name="incident_report"
          rows={4}
          defaultValue={defaultValues?.incident_report ?? ''}
          placeholder="Indique si hubo algún imprevisto durante el trabajo…"
        />
      </section>

      <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-4">
        <span className="text-sm text-muted-foreground">Total general de la orden</span>
        <span className="text-lg font-semibold">{formatCOP(matTotal + expTotal + workTotal)}</span>
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
