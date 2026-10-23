import Link from 'next/link'
import { createServiceClient as createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, ChevronRight } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import type { Material, MaterialCategory } from '@/lib/database.types'

type MaterialRow = Material & {
  material_categories: Pick<MaterialCategory, 'name'> | null
  total_stock: number
}

export const dynamic = 'force-dynamic'

export default async function MaterialsPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const [{ data: rawMaterials }, { data: rawStock }] = await Promise.all([
    supabase
      .from('materials')
      .select('*, material_categories(name)')
      .order('description'),
    supabase.from('v_material_stock').select('material_id, total_stock'),
  ])

  const stockMap: Record<string, number> = {}
  for (const s of rawStock ?? []) stockMap[s.material_id] = Number(s.total_stock)

  const materials = ((rawMaterials ?? []) as MaterialRow[]).map((m) => ({
    ...m,
    total_stock: stockMap[m.id] ?? 0,
  }))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Materiales</h1>
          <p className="text-sm text-muted-foreground">{materials.length} registrados</p>
        </div>
        <Link href="/admin/materials/new" className={buttonVariants()}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Material
        </Link>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descripción</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Especificación</TableHead>
              <TableHead>Unidad</TableHead>
              <TableHead className="text-right">Stock Disponible</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {materials.map((m) => (
              <TableRow key={m.id} className="group">
                <TableCell className="font-medium">{m.description}</TableCell>
                <TableCell>
                  <Badge variant="outline">{m.material_categories?.name ?? '—'}</Badge>
                </TableCell>
                <TableCell className="text-sm font-mono text-muted-foreground">
                  {m.specification ?? '—'}
                </TableCell>
                <TableCell className="text-sm">{m.unit_of_measure}</TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {m.total_stock.toFixed(3)}
                </TableCell>
                <TableCell>
                  <Link
                    href={`/admin/materials/${m.id}`}
                    className={buttonVariants({
                      size: 'icon',
                      variant: 'ghost',
                      className: 'opacity-0 group-hover:opacity-100',
                    })}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </TableCell>
              </TableRow>
            ))}
            {!materials.length && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Sin materiales.{' '}
                  <Link href="/admin/materials/new" className="underline">
                    Agregar uno
                  </Link>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
