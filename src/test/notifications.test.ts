import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mocks must be declared before importing the modules under test so Vitest
// can hoist them and replace the real implementations.
vi.mock('@/lib/supabase/server', () => ({ createServiceClient: vi.fn() }))
vi.mock('@/lib/notifications/gmail', () => ({ sendEmail: vi.fn() }))

import { shouldNotify } from '@/lib/notifications/email'
import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/notifications/gmail'
import { dispatchInspectionNotification } from '@/lib/notifications/service'

// ─── Suite 1: trigger predicate ───────────────────────────────────────────────

describe('shouldNotify', () => {
  it('returns false for pass', () => {
    expect(shouldNotify('pass')).toBe(false)
  })

  it('returns true for fail', () => {
    expect(shouldNotify('fail')).toBe(true)
  })

  it('returns true for conditional', () => {
    expect(shouldNotify('conditional')).toBe(true)
  })
})

// ─── Suite 2: notification logging ────────────────────────────────────────────

const mockCreateServiceClient = vi.mocked(createServiceClient)
const mockSendEmail = vi.mocked(sendEmail)

const ASSET_DATA = {
  tag: 'TK-001',
  serial_number: 'SN-123',
  customer_id: 'cust-uuid',
  location_id: 'loc-uuid',
  customers: { name: 'Empresa ABC', contact_email: 'contact@abc.com' },
  locations: { name: 'Planta Norte', city: 'Bogotá', department: 'Cundinamarca' },
}

const BASE_PARAMS = {
  inspectionId: 'insp-uuid',
  assetId: 'asset-uuid',
  result: 'fail' as const,
  inspectionDate: '2026-05-22',
  inspectionType: 'visual' as const,
  nextDueDate: null,
}

function makeSupabaseMock() {
  const updateEq = vi.fn().mockResolvedValue({ error: null })
  const update = vi.fn().mockReturnValue({ eq: updateEq })

  const notifSingle = vi.fn().mockResolvedValue({ data: { id: 'notif-uuid' }, error: null })
  const notifSelect = vi.fn().mockReturnValue({ single: notifSingle })
  const insert = vi.fn().mockReturnValue({ select: notifSelect })

  const assetSingle = vi.fn().mockResolvedValue({ data: ASSET_DATA, error: null })
  const assetEq = vi.fn().mockReturnValue({ single: assetSingle })
  const assetSelect = vi.fn().mockReturnValue({ eq: assetEq })

  const from = vi.fn((table: string) => {
    if (table === 'assets') return { select: assetSelect }
    return { insert, update }
  })

  return { client: { from }, insert, update, updateEq }
}

describe('dispatchInspectionNotification — notification logging', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('skips DB entirely when result is pass', async () => {
    const { client } = makeSupabaseMock()
    mockCreateServiceClient.mockResolvedValue(client as never)

    await dispatchInspectionNotification({ ...BASE_PARAMS, result: 'pass' })

    expect(client.from).not.toHaveBeenCalled()
  })

  it('inserts a pending row then updates to sent on email success', async () => {
    const { client, insert, update } = makeSupabaseMock()
    mockCreateServiceClient.mockResolvedValue(client as never)
    mockSendEmail.mockResolvedValue(undefined)

    await dispatchInspectionNotification(BASE_PARAMS)

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'pending',
        inspection_id: 'insp-uuid',
        channel: 'email',
      }),
    )
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'sent' }),
    )
  })

  it('inserts a pending row then updates to failed on email error', async () => {
    const { client, insert, update } = makeSupabaseMock()
    mockCreateServiceClient.mockResolvedValue(client as never)
    mockSendEmail.mockRejectedValue(new Error('SMTP timeout'))

    await dispatchInspectionNotification(BASE_PARAMS)

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'pending' }),
    )
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failed', error_message: 'SMTP timeout' }),
    )
  })

  it('also triggers for conditional result', async () => {
    const { client, insert } = makeSupabaseMock()
    mockCreateServiceClient.mockResolvedValue(client as never)
    mockSendEmail.mockResolvedValue(undefined)

    await dispatchInspectionNotification({ ...BASE_PARAMS, result: 'conditional' })

    expect(insert).toHaveBeenCalled()
  })
})
