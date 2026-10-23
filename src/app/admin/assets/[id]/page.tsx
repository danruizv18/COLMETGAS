import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServiceClient as createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Pencil, ClipboardList } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import type { Asset, AssetInspection, AssetType, AssetStatus, InspectionResult } from '@/lib/database.types'

type AssetWithRelations = Asset & {
  customers: { name: string } | null
  locations: { name: string; city: string; department: string } | null
}

type InspectionWithTechnician = AssetInspection & {
  personnel: { full_name: string } | null
}

export const dynamic = 'force-dynamic'

const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  tank_stationary: 'Tanque Estacionario',
  tank_transport: 'Tanque de Transporte',
  gas_network: 'Red de Gas',
  metal_structure: 'Estructura Metálica',
}

const STATUS_COLORS: Record<AssetStatus, string> = {
  active: 'bg-green-100 text-green-800',
  out_of_service: 'bg-amber-100 text-amber-800',
  decommissioned: 'bg-gray-100 text-gray-600',
}

const STATUS_LABELS: Record<AssetStatus, string> = {
  active: 'Activo',
  out_of_service: 'Fuera de Servicio',
  decommissioned: 'Dado de Baja',
}

const RESULT_COLORS: Record<InspectionResult, string> = {
  pass: 'bg-green-100 text-green-800',
  fail: 'bg-red-100 text-red-800',
  conditional: 'bg-amber-100 text-amber-800',
}

const RESULT_LABELS: Record<InspectionResult, string> = {
  pass: 'Aprobado',
  fail: 'Reprobado',
  conditional: 'Condicional',
}

export default async function AssetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: rawAsset } = await supabase
    .from('assets')
    .select('*, customers(name), locations(name, city, department)')
    .eq('id', id)
    .single()

  const { data: rawInspections } = await supabase
    .from('asset_inspections')
    .select('*, personnel(full_name)')
    .eq('asset_id', id)
    .order('inspection_date', { ascending: false })

  if (!rawAsset) notFound()

  const asset = rawAsset as unknown as AssetWithRelations
  const inspections = (rawInspections ?? []) as unknown as InspectionWithTechnician[]
  const today = new Date().toISOString().split('T')[0]
  const customer = asset.customers
  const location = asset.locations

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight font-mono">{asset.tag}</h1>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[asset.status]}`}>
              {STATUS_LABELS[asset.status]}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {ASSET_TYPE_LABELS[asset.asset_type]}
            {customer && ` · ${customer.name}`}
          </p>
        </div>
        <Link href={`/admin/assets/${id}/edit`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
          <Pencil className="mr-2 h-3.5 w-3.5" />
          Editar
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {asset.serial_number && (
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Número de Serie</p>
              <p className="font-mono font-medium">{asset.serial_number}</p>
            </CardContent>
          </Card>
        )}
        {(asset.capacity_value != null) && (
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Capacidad</p>
              <p className="font-medium">{asset.capacity_value} {asset.capacity_unit}</p>
            </CardContent>
          </Card>
        )}
        {asset.manufacturer && (
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Fabricante</p>
              <p className="font-medium">{asset.manufacturer}</p>
              {asset.manufacture_date && (
                <p className="text-xs text-muted-foreground">{asset.manufacture_date}</p>
              )}
            </CardContent>
          </Card>
        )}
        {asset.install_date && (
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Instalado</p>
              <p className="font-medium">{asset.install_date}</p>
            </CardContent>
          </Card>
        )}
        {location && (
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Sede</p>
              <p className="font-medium">{location.name}</p>
              <p className="text-xs text-muted-foreground">{location.city}, {location.department}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {asset.notes && (
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground mb-1">Notas</p>
            <p className="text-sm">{asset.notes}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center gap-2 pb-3">
          <ClipboardList className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">
            Historial de Inspecciones ({inspections?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Resultado</TableHead>
                <TableHead>Próxima</TableHead>
                <TableHead>Técnico</TableHead>
                <TableHead>Certificado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inspections?.map((insp) => {
                const isOverdue = insp.next_due_date && insp.next_due_date < today
                const technician = insp.personnel

                return (
                  <TableRow key={insp.id}>
                    <TableCell className="text-sm">{insp.inspection_date}</TableCell>
                    <TableCell className="text-sm capitalize">
                      {insp.inspection_type.replace('_', ' ')}
                    </TableCell>
                    <TableCell>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${RESULT_COLORS[insp.result]}`}>
                        {RESULT_LABELS[insp.result]}
                      </span>
                    </TableCell>
                    <TableCell>
                      {insp.next_due_date ? (
                        <span className={isOverdue ? 'text-destructive font-medium text-sm' : 'text-sm'}>
                          {insp.next_due_date}
                          {isOverdue && ' ⚠'}
                        </span>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="text-sm">{technician?.full_name ?? '—'}</TableCell>
                    <TableCell className="font-mono text-xs">{insp.certificate_number ?? '—'}</TableCell>
                  </TableRow>
                )
              })}
              {!inspections?.length && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                    Sin inspecciones registradas
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
