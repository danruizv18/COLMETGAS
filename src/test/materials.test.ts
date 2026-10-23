import { describe, it, expect } from 'vitest'
import { batchAvailable, materialStock, assertCanConsume } from '@/lib/materials/stock'

// ─── Suite 1: Derived stock arithmetic ────────────────────────────────────────

describe('Aritmética de stock derivado', () => {
  it('disponible de un lote = cantidad recibida − consumida', () => {
    expect(batchAvailable(100, 40)).toBe(60)
  })

  it('lote sin consumos tiene disponible igual al total recibido', () => {
    expect(batchAvailable(50, 0)).toBe(50)
  })

  it('lote totalmente consumido tiene disponible igual a cero', () => {
    expect(batchAvailable(80, 80)).toBe(0)
  })

  it('stock de material = suma de disponibles de todos sus lotes', () => {
    const batches = [
      { received: 100, consumed: 30 },  // available: 70
      { received: 50, consumed: 20 },   // available: 30
      { received: 200, consumed: 200 }, // available: 0
    ]
    expect(materialStock(batches)).toBe(100)
  })

  it('stock de material sin lotes es cero', () => {
    expect(materialStock([])).toBe(0)
  })

  it('stock de material con un solo lote', () => {
    expect(materialStock([{ received: 500, consumed: 125 }])).toBe(375)
  })

  it('stock correcto con múltiples lotes parcialmente consumidos', () => {
    const batches = [
      { received: 10, consumed: 3 },
      { received: 20, consumed: 5 },
      { received: 15, consumed: 0 },
    ]
    // 7 + 15 + 15 = 37
    expect(materialStock(batches)).toBe(37)
  })
})

// ─── Suite 2: Over-consumption rejection ─────────────────────────────────────

describe('Validación de sobre-consumo', () => {
  it('permite consumo exactamente igual al disponible', () => {
    expect(() => assertCanConsume(50, 50)).not.toThrow()
  })

  it('permite consumo menor al disponible', () => {
    expect(() => assertCanConsume(8, 10)).not.toThrow()
  })

  it('rechaza consumo de 10 cuando solo hay 8 disponibles', () => {
    expect(() => assertCanConsume(10, 8)).toThrow(
      'Stock insuficiente en lote. Disponible: 8, Solicitado: 10'
    )
  })

  it('rechaza consumo de lote completamente agotado', () => {
    expect(() => assertCanConsume(1, 0)).toThrow('Stock insuficiente')
  })

  it('rechaza cualquier consumo cuando disponible es cero', () => {
    expect(() => assertCanConsume(0.001, 0)).toThrow('Stock insuficiente')
  })

  it('mensaje de error incluye los valores exactos', () => {
    let message = ''
    try {
      assertCanConsume(25.5, 10.25)
    } catch (e) {
      message = (e as Error).message
    }
    expect(message).toContain('10.25')
    expect(message).toContain('25.5')
  })
})

// ─── Suite 3: Traceability chain ──────────────────────────────────────────────

describe('Cadena de trazabilidad', () => {
  // Simulates the shape of data returned by the work-order detail query
  type ConsumptionRow = {
    id: string
    quantity_used: number
    used_date: string
    material_batches: {
      batch_number: string
      heat_number: string | null
      supplier: string | null
      mtr_file_path: string | null
      materials: { description: string; specification: string | null; unit_of_measure: string }
    }
  }

  const mockConsumptions: ConsumptionRow[] = [
    {
      id: 'c-1',
      quantity_used: 50,
      used_date: '2026-05-01',
      material_batches: {
        batch_number: 'LOTE-2026-001',
        heat_number: 'H-2026-001',
        supplier: 'Aceros del Norte S.A.',
        mtr_file_path: 'mtrs/mat-uuid/1716500000_test.pdf',
        materials: { description: 'Plancha ASTM A516 Gr 70', specification: 'ASTM A516 Gr 70', unit_of_measure: 'kg' },
      },
    },
    {
      id: 'c-2',
      quantity_used: 10,
      used_date: '2026-05-02',
      material_batches: {
        batch_number: 'LOTE-2026-002',
        heat_number: 'H-2026-002',
        supplier: 'SteelTech Colombia',
        mtr_file_path: null,
        materials: { description: 'Electrodo E7018', specification: 'AWS A5.1', unit_of_measure: 'kg' },
      },
    },
    {
      id: 'c-3',
      quantity_used: 2.5,
      used_date: '2026-05-03',
      material_batches: {
        batch_number: 'LOTE-2026-001',
        heat_number: 'H-2026-001',
        supplier: 'Aceros del Norte S.A.',
        mtr_file_path: 'mtrs/mat-uuid/1716500000_test.pdf',
        materials: { description: 'Plancha ASTM A516 Gr 70', specification: 'ASTM A516 Gr 70', unit_of_measure: 'kg' },
      },
    },
  ]

  // Pure function that maps consumption rows to the traceability chain shape
  function buildChain(rows: ConsumptionRow[]) {
    return rows.map((c) => ({
      material: c.material_batches.materials.description,
      specification: c.material_batches.materials.specification,
      heatNumber: c.material_batches.heat_number,
      supplier: c.material_batches.supplier,
      batchNumber: c.material_batches.batch_number,
      mtrPath: c.material_batches.mtr_file_path,
      quantityUsed: c.quantity_used,
      unit: c.material_batches.materials.unit_of_measure,
      usedDate: c.used_date,
    }))
  }

  it('returns correct number of entries for a work order', () => {
    const chain = buildChain(mockConsumptions)
    expect(chain).toHaveLength(3)
  })

  it('returns correct heat numbers for each consumption', () => {
    const chain = buildChain(mockConsumptions)
    expect(chain[0].heatNumber).toBe('H-2026-001')
    expect(chain[1].heatNumber).toBe('H-2026-002')
    expect(chain[2].heatNumber).toBe('H-2026-001')
  })

  it('returns correct MTR paths, including null when absent', () => {
    const chain = buildChain(mockConsumptions)
    expect(chain[0].mtrPath).toBe('mtrs/mat-uuid/1716500000_test.pdf')
    expect(chain[1].mtrPath).toBeNull()
    expect(chain[2].mtrPath).toBe('mtrs/mat-uuid/1716500000_test.pdf')
  })

  it('returns correct suppliers', () => {
    const chain = buildChain(mockConsumptions)
    expect(chain[0].supplier).toBe('Aceros del Norte S.A.')
    expect(chain[1].supplier).toBe('SteelTech Colombia')
  })

  it('preserves quantity_used values accurately', () => {
    const chain = buildChain(mockConsumptions)
    expect(chain[0].quantityUsed).toBe(50)
    expect(chain[1].quantityUsed).toBe(10)
    expect(chain[2].quantityUsed).toBe(2.5)
  })

  it('all entries have a material description string', () => {
    const chain = buildChain(mockConsumptions)
    expect(chain.every((e) => typeof e.material === 'string' && e.material.length > 0)).toBe(true)
  })

  it('reverse lookup: entries sharing a heat number are correctly grouped', () => {
    const chain = buildChain(mockConsumptions)
    const heat1Entries = chain.filter((e) => e.heatNumber === 'H-2026-001')
    expect(heat1Entries).toHaveLength(2)
    expect(heat1Entries.every((e) => e.batchNumber === 'LOTE-2026-001')).toBe(true)
  })
})
