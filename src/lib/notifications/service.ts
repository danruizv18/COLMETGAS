import type { InspectionResult, InspectionType } from '@/lib/database.types'
import { createServiceClient } from '@/lib/supabase/server'
import { shouldNotify, buildInspectionEmail, type InspectionEmailData } from './email'
import { sendEmail } from './gmail'

export interface DispatchParams {
  inspectionId: string
  assetId: string
  result: InspectionResult
  inspectionDate: string
  inspectionType: InspectionType
  nextDueDate: string | null
}

type AssetRow = {
  tag: string
  serial_number: string | null
  customer_id: string
  location_id: string | null
  customers: { name: string; contact_email: string | null } | null
  locations: { name: string; city: string | null; department: string | null } | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = any

export async function dispatchInspectionNotification(params: DispatchParams): Promise<void> {
  if (!shouldNotify(params.result)) return

  const supabase = (await createServiceClient()) as DB

  const { data: asset, error: assetError } = await supabase
    .from('assets')
    .select(
      'tag, serial_number, customer_id, location_id, customers(name, contact_email), locations(name, city, department)',
    )
    .eq('id', params.assetId)
    .single()

  if (assetError || !asset) {
    console.error('[notification] failed to fetch asset:', assetError?.message)
    return
  }

  const a = asset as AssetRow
  const customer = a.customers
  if (!customer?.contact_email) {
    console.warn('[notification] customer has no contact_email, skipping')
    return
  }

  const location = a.locations

  const emailData: InspectionEmailData = {
    customerName: customer.name,
    assetTag: a.tag,
    serialNumber: a.serial_number,
    locationName: location?.name ?? null,
    locationCity: location?.city ?? null,
    locationDepartment: location?.department ?? null,
    inspectionDate: params.inspectionDate,
    inspectionType: params.inspectionType,
    result: params.result,
    nextDueDate: params.nextDueDate,
  }

  const { subject, body } = buildInspectionEmail(emailData)

  const { data: notification, error: insertError } = await supabase
    .from('notifications')
    .insert({
      inspection_id: params.inspectionId,
      customer_id: a.customer_id,
      recipient_email: customer.contact_email,
      channel: 'email',
      subject,
      body,
      status: 'pending',
    })
    .select('id')
    .single()

  if (insertError || !notification) {
    console.error('[notification] failed to log notification row:', insertError?.message)
    return
  }

  try {
    await sendEmail({ to: customer.contact_email, subject, body })
    await supabase
      .from('notifications')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', notification.id)
  } catch (err) {
    await supabase
      .from('notifications')
      .update({
        status: 'failed',
        error_message: err instanceof Error ? err.message : String(err),
      })
      .eq('id', notification.id)
  }
}
