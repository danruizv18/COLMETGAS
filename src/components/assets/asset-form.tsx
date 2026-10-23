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
import type { Asset, Customer, Location } from '@/lib/database.types'
import type { AssetFormState } from '@/lib/actions/assets'

interface Props {
  action: (prev: AssetFormState, data: FormData) => Promise<AssetFormState>
  defaultValues?: Partial<Asset>
  customers: Pick<Customer, 'id' | 'name'>[]
  locations: Pick<Location, 'id' | 'name' | 'customer_id'>[]
  submitLabel?: string
}

const ASSET_TYPE_LABELS = {
  tank_stationary: 'Tanque Estacionario',
  tank_transport: 'Tanque de Transporte',
  gas_network: 'Red de Gas',
  metal_structure: 'Estructura Metálica',
}

const STATUS_LABELS = {
  active: 'Activo',
  out_of_service: 'Fuera de Servicio',
  decommissioned: 'Dado de Baja',
}

export function AssetForm({ action, defaultValues, customers, locations, submitLabel = 'Guardar' }: Props) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(action, {})

  useEffect(() => {
    if (state.message === 'ok') router.push('/admin/assets')
  }, [state.message, router])

  return (
    <form action={formAction} className="space-y-4 max-w-2xl">
      {state.message && state.message !== 'ok' && (
        <p className="text-sm text-destructive rounded-md bg-destructive/10 p-3">{state.message}</p>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="asset_type">Tipo de Activo *</Label>
          <Select name="asset_type" defaultValue={defaultValues?.asset_type ?? 'tank_stationary'}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ASSET_TYPE_LABELS).map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {state.errors?.asset_type && <p className="text-xs text-destructive">{state.errors.asset_type[0]}</p>}
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="tag">Tag / Código *</Label>
          <Input name="tag" id="tag" defaultValue={defaultValues?.tag} placeholder="TK-CALI-001" />
          {state.errors?.tag && <p className="text-xs text-destructive">{state.errors.tag[0]}</p>}
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
          {state.errors?.customer_id && <p className="text-xs text-destructive">{state.errors.customer_id[0]}</p>}
        </div>

        <div className="grid gap-1.5">
          <Label>Sede</Label>
          <Select name="location_id" defaultValue={defaultValues?.location_id ?? ''}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar sede (opcional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Sin sede</SelectItem>
              {locations.map((l) => (
                <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="serial_number">Número de Serie</Label>
          <Input name="serial_number" id="serial_number" defaultValue={defaultValues?.serial_number ?? ''} placeholder="SN-TS-001" />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="status">Estado</Label>
          <Select name="status" defaultValue={defaultValues?.status ?? 'active'}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_LABELS).map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="capacity_value">Capacidad</Label>
          <Input name="capacity_value" id="capacity_value" type="number" step="0.001" defaultValue={defaultValues?.capacity_value ?? ''} placeholder="500" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="capacity_unit">Unidad</Label>
          <Input name="capacity_unit" id="capacity_unit" defaultValue={defaultValues?.capacity_unit ?? ''} placeholder="galones" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="install_date">Fecha Instalación</Label>
          <Input name="install_date" id="install_date" type="date" defaultValue={defaultValues?.install_date ?? ''} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="manufacturer">Fabricante</Label>
          <Input name="manufacturer" id="manufacturer" defaultValue={defaultValues?.manufacturer ?? ''} placeholder="INDUVAC" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="manufacture_date">Fecha Fabricación</Label>
          <Input name="manufacture_date" id="manufacture_date" type="date" defaultValue={defaultValues?.manufacture_date ?? ''} />
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="notes">Notas</Label>
        <Textarea name="notes" id="notes" rows={3} defaultValue={defaultValues?.notes ?? ''} placeholder="Observaciones adicionales" />
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
