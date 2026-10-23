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
import { Pencil, Plus, FileText, ExternalLink } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { BatchForm } from '@/components/materials/batch-form'
import { createBatch } from '@/lib/actions/materials'
import type { Material, MaterialCategory } from '@/lib/database.types'

export const dynamic = 'force-dynamic'

type BatchWithStock = {
  id: string
  batch_number: string
  heat_number: string | null
  supplier: string | null
  received_date: string | null
  quantity: number
  mtr_file_path: string | null
  notes: string | null
  available: number
  consumed: number
  mtrUrl: string | null
}

export default async function MaterialDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const [{ data: rawMaterial }, { data: rawBatches }, { data: rawStock }] = await Promise.all([
    supabase
      .from('materials')
      .select('*, material_categories(name)')
      .eq('id', id)
      .single(),
    supabase
      .from('material_batches')
      .select('*')
      .eq('material_id', id)
      .order('received_date', { ascending: false }),
    supabase.from('v_batch_stock').select('batch_id, available, consumed').eq('material_id', id),
  ])

  if (!rawMaterial) notFound()

  const material = rawMaterial as Material & { material_categories: Pick<MaterialCategory, 'name'> | null }
  const stockMap: Record<string, { available: number; consumed: number }> = {}
  for (const s of rawStock ?? []) {
    stockMap[s.batch_id] = { available: Number(s.available), consumed: Number(s.consumed) }
  }

  // Generate signed URLs for MTR files (1-hour expiry)
  const batches: BatchWithStock[] = await Promise.all(
    ((rawBatches ?? []) as BatchWithStock[]).map(async (b) => {
      let mtrUrl: string | null = null
      if (b.mtr_file_path) {
        const { data } = await supabase.storage
          .from('documents')
          .createSignedUrl(b.mtr_file_path, 3600)
        mtrUrl = data?.signedUrl ?? null
      }
      const stock = stockMap[b.id] ?? { available: 0, consumed: 0 }
      return { ...b, ...stock, mtrUrl }
    })
  )

  const totalStock = batches.reduce((s, b) => s + b.available, 0)
  const action = createBatch

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{material.description}</h1>
          <div className="flex items-center gap-2 mt-1">
            {material.material_categories && (
              <Badge variant="outline">{material.material_categories.name}</Badge>
            )}
            {material.specification && (
              <span className="text-sm font-mono text-muted-foreground">{material.specification}</span>
            )}
            <span className="text-sm text-muted-foreground">· {material.unit_of_measure}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/admin/materials/${id}/edit`}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            <Pencil className="mr-2 h-3.5 w-3.5" />
            Editar
          </Link>
        </div>
      </div>

      <div className="rounded-lg border bg-card px-6 py-4 flex items-center gap-4">
        <div>
          <p className="text-xs text-muted-foreground">Stock total disponible</p>
          <p className="text-2xl font-bold font-mono">
            {totalStock.toFixed(3)} <span className="text-base font-normal text-muted-foreground">{material.unit_of_measure}</span>
          </p>
        </div>
        <div className="ml-8">
          <p className="text-xs text-muted-foreground">Lotes registrados</p>
          <p className="text-2xl font-bold">{batches.length}</p>
        </div>
      </div>

      {/* Batch list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Lotes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lote</TableHead>
                <TableHead>Colada (Heat)</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Recibido</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead className="text-right">Consumido</TableHead>
                <TableHead className="text-right">Disponible</TableHead>
                <TableHead>MTR</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-mono text-sm font-medium">{b.batch_number}</TableCell>
                  <TableCell className="font-mono text-sm">{b.heat_number ?? '—'}</TableCell>
                  <TableCell className="text-sm">{b.supplier ?? '—'}</TableCell>
                  <TableCell className="text-sm">{b.received_date ?? '—'}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{Number(b.quantity).toFixed(3)}</TableCell>
                  <TableCell className="text-right font-mono text-sm text-muted-foreground">{b.consumed.toFixed(3)}</TableCell>
                  <TableCell className="text-right font-mono text-sm font-medium">
                    {b.available.toFixed(3)}
                  </TableCell>
                  <TableCell>
                    {b.mtrUrl ? (
                      <a
                        href={b.mtrUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <FileText className="h-3 w-3" />
                        Ver MTR
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!batches.length && (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    Sin lotes registrados
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add batch */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Registrar Nuevo Lote
          </CardTitle>
        </CardHeader>
        <CardContent>
          <BatchForm action={action} materialId={id} />
        </CardContent>
      </Card>
    </div>
  )
}
