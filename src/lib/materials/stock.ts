// Pure stock calculation functions — mirror the v_batch_stock / v_material_stock view logic.
// Used in tests and as the app-level guard before DB writes.
// The database trigger fn_check_batch_availability is the authoritative enforcement point.

export function batchAvailable(received: number, consumed: number): number {
  return received - consumed
}

export function materialStock(batches: { received: number; consumed: number }[]): number {
  return batches.reduce((sum, b) => sum + batchAvailable(b.received, b.consumed), 0)
}

export function assertCanConsume(requested: number, available: number): void {
  if (requested > available) {
    throw new Error(
      `Stock insuficiente en lote. Disponible: ${available}, Solicitado: ${requested}`
    )
  }
}
