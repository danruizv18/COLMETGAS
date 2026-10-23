import { createServiceClient as createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Package, AlertTriangle, Clock } from 'lucide-react'

export const dynamic = 'force-dynamic'

async function getStats() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]
  const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const [totalAssetsRes, dueSoonRes, overdueRes] = await Promise.all([
    supabase.from('assets').select('id', { count: 'exact', head: true }).neq('status', 'decommissioned'),
    supabase
      .from('asset_inspections')
      .select('id', { count: 'exact', head: true })
      .gte('next_due_date', today)
      .lte('next_due_date', in30Days),
    supabase
      .from('asset_inspections')
      .select('id', { count: 'exact', head: true })
      .lt('next_due_date', today),
  ])

  return {
    totalAssets: totalAssetsRes.count ?? 0,
    dueSoon: dueSoonRes.count ?? 0,
    overdue: overdueRes.count ?? 0,
  }
}

export default async function AdminDashboard() {
  const { totalAssets, dueSoon, overdue } = await getStats()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Resumen de operaciones COLMETGAS</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Activos Activos
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalAssets}</p>
            <p className="text-xs text-muted-foreground mt-1">Excluye dados de baja</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Inspecciones en 30 días
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-amber-600">{dueSoon}</p>
            <p className="text-xs text-muted-foreground mt-1">Próximas a vencer</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Inspecciones Vencidas
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-destructive">{overdue}</p>
            <p className="text-xs text-muted-foreground mt-1">Requieren atención inmediata</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
