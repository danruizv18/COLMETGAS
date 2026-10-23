export type MaterialLine = { description: string; unit: string; quantity: number; unit_price: number }
export type ExpenseLine = { description: string; amount: number }
export type WorkerLine = {
  worker_name: string
  personnel_id: string | null
  days_worked: number
  daily_rate: number
}

export function materialsTotal(lines: Pick<MaterialLine, 'quantity' | 'unit_price'>[]): number {
  return lines.reduce((s, l) => s + Number(l.quantity) * Number(l.unit_price), 0)
}

export function expensesTotal(lines: Pick<ExpenseLine, 'amount'>[]): number {
  return lines.reduce((s, l) => s + Number(l.amount), 0)
}

export function workersTotal(lines: Pick<WorkerLine, 'days_worked' | 'daily_rate'>[]): number {
  return lines.reduce((s, l) => s + Number(l.days_worked) * Number(l.daily_rate), 0)
}

const copFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

export function formatCOP(value: number): string {
  return copFormatter.format(Number.isFinite(value) ? value : 0)
}
