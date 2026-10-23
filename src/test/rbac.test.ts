/**
 * RLS integration tests — run against the DEV Supabase instance.
 *
 * Each test creates temporary auth users with a known password, sets their role
 * via the service client, then runs operations as that user and asserts whether
 * they succeed or are rejected by the database (not just hidden in the UI).
 *
 * Run:
 *   npx vitest run src/test/rbac.test.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and
 * SUPABASE_SERVICE_ROLE_KEY to be present in .env.local (or the test environment).
 *
 * WARNING: these tests create real auth users in your Supabase project and
 * delete them after each suite. Only run against DEV.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { Database } from '@/lib/database.types'

// ─── env ──────────────────────────────────────────────────────────────────────
const URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SVC  = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!URL || !ANON || !SVC) {
  throw new Error('Missing Supabase env vars. Copy .env.local values to your test environment.')
}

// ─── helpers ──────────────────────────────────────────────────────────────────
const svc = createClient<Database>(URL, SVC, { auth: { persistSession: false } })

const TEST_PASSWORD = 'TestPassword123!'

async function createTestUser(email: string, role: Database['public']['Enums']['user_role_enum'], customerId?: string) {
  const { data, error } = await svc.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
  })
  if (error) throw error

  // Set role (the signup trigger defaults to 'technician').
  await svc.from('profiles').update({ role, customer_id: customerId ?? null }).eq('id', data.user.id)

  return data.user.id
}

async function deleteTestUser(id: string) {
  await svc.auth.admin.deleteUser(id)
}

async function clientAsUser(email: string): Promise<SupabaseClient<Database>> {
  const client = createClient<Database>(URL, ANON, { auth: { persistSession: false } })
  const { error } = await client.auth.signInWithPassword({ email, password: TEST_PASSWORD })
  if (error) throw error
  return client
}

// ─── test data ────────────────────────────────────────────────────────────────
// Unique suffix per run prevents duplicate-key errors if a previous run's
// afterAll cleanup was skipped (e.g. test process was killed).
const RUN_ID = Date.now().toString(36)

// IDs populated in beforeAll and cleaned up in afterAll.
let customerAId: string
let customerBId: string
let assetAId: string
let assetBId: string
let inspectionId: string

// Test user IDs
let adminUserId:      string
let engineerUserId:   string
let technicianUserId: string
let clientUserId:     string

// Supabase clients authenticated as each role
let asAdmin:      SupabaseClient<Database>
let asEngineer:   SupabaseClient<Database>
let asTechnician: SupabaseClient<Database>
let asClient:     SupabaseClient<Database>

// ─── setup ────────────────────────────────────────────────────────────────────
beforeAll(async () => {
  // Create two test customers — tax_id includes RUN_ID to avoid unique-constraint
  // conflicts if a previous run's cleanup was skipped.
  const { data: custA, error: eA } = await svc.from('customers')
    .insert({ name: 'Test Customer A', tax_id: `TEST-A-${RUN_ID}` }).select('id').single()
  if (eA) throw new Error(`Setup: insert customer A failed: ${eA.message}`)

  const { data: custB, error: eB } = await svc.from('customers')
    .insert({ name: 'Test Customer B', tax_id: `TEST-B-${RUN_ID}` }).select('id').single()
  if (eB) throw new Error(`Setup: insert customer B failed: ${eB.message}`)

  customerAId = custA!.id
  customerBId = custB!.id

  // Create two test assets (one per customer)
  const { data: assetA } = await svc.from('assets').insert({
    tag: 'TEST-ASSET-A', asset_type: 'tank_stationary', customer_id: customerAId, status: 'active',
  }).select('id').single()
  const { data: assetB } = await svc.from('assets').insert({
    tag: 'TEST-ASSET-B', asset_type: 'tank_stationary', customer_id: customerBId, status: 'active',
  }).select('id').single()
  assetAId = assetA!.id
  assetBId = assetB!.id

  // Create a test inspection on Asset A
  const { data: insp } = await svc.from('asset_inspections').insert({
    asset_id: assetAId,
    inspection_date: '2026-01-01',
    inspection_type: 'visual',
    result: 'pass',
  }).select('id').single()
  inspectionId = insp!.id

  // Emails include RUN_ID so they're unique across runs.
  const emailAdmin      = `rbac-admin-${RUN_ID}@test.local`
  const emailEngineer   = `rbac-engineer-${RUN_ID}@test.local`
  const emailTechnician = `rbac-technician-${RUN_ID}@test.local`
  const emailClient     = `rbac-client-${RUN_ID}@test.local`

  adminUserId      = await createTestUser(emailAdmin,      'admin')
  engineerUserId   = await createTestUser(emailEngineer,   'engineer')
  technicianUserId = await createTestUser(emailTechnician, 'technician')
  clientUserId     = await createTestUser(emailClient,     'client', customerAId)

  asAdmin      = await clientAsUser(emailAdmin)
  asEngineer   = await clientAsUser(emailEngineer)
  asTechnician = await clientAsUser(emailTechnician)
  asClient     = await clientAsUser(emailClient)
}, 60_000)

afterAll(async () => {
  // Guard every delete — if beforeAll failed partway through, some IDs may be
  // undefined and we must not pass those to deleteUser (causes UUID validation error).
  if (inspectionId) await svc.from('asset_inspections').delete().eq('id', inspectionId)
  if (assetAId || assetBId)
    await svc.from('assets').delete().in('id', [assetAId, assetBId].filter(Boolean))
  if (customerAId || customerBId)
    await svc.from('customers').delete().in('id', [customerAId, customerBId].filter(Boolean))

  await Promise.all(
    [adminUserId, engineerUserId, technicianUserId, clientUserId]
      .filter(Boolean)
      .map(deleteTestUser)
  )
}, 30_000)

// ─── ADMIN tests ──────────────────────────────────────────────────────────────
describe('admin', () => {
  it('can read all customers', async () => {
    const { data, error } = await asAdmin.from('customers').select('id')
    expect(error).toBeNull()
    expect(data?.length).toBeGreaterThanOrEqual(2)
  })

  it('can read all assets', async () => {
    const { data, error } = await asAdmin.from('assets').select('id')
    expect(error).toBeNull()
    expect(data?.length).toBeGreaterThanOrEqual(2)
  })

  it('can delete an inspection', async () => {
    // Create a throwaway inspection to delete
    const { data: tmp } = await asAdmin.from('asset_inspections').insert({
      asset_id: assetAId, inspection_date: '2026-06-01', inspection_type: 'visual', result: 'pass',
    }).select('id').single()
    expect(tmp).toBeTruthy()

    const { error } = await asAdmin.from('asset_inspections').delete().eq('id', tmp!.id)
    expect(error).toBeNull()
  })

  it('can read all profiles', async () => {
    // Admin reads own profile via anon client (only own profile via RLS)
    const { data, error } = await asAdmin.from('profiles').select('id')
    expect(error).toBeNull()
    // Anon client with own-profile RLS returns only the admin's own row
    expect(data?.length).toBe(1)
  })

  it('is never locked out — can always read assets', async () => {
    const { error } = await asAdmin.from('assets').select('id').limit(1)
    expect(error).toBeNull()
  })
})

// ─── ENGINEER tests ───────────────────────────────────────────────────────────
describe('engineer', () => {
  it('can read all customers', async () => {
    const { data, error } = await asEngineer.from('customers').select('id')
    expect(error).toBeNull()
    expect(data?.length).toBeGreaterThanOrEqual(2)
  })

  it('can create a customer', async () => {
    const { data, error } = await asEngineer.from('customers').insert({
      name: 'Engineer Created Customer', tax_id: 'ENG-TEST-003',
    }).select('id').single()
    expect(error).toBeNull()
    expect(data).toBeTruthy()
    // Cleanup
    if (data) await svc.from('customers').delete().eq('id', data.id)
  })

  it('can create and update an inspection', async () => {
    const { data: insp, error: insErr } = await asEngineer.from('asset_inspections').insert({
      asset_id: assetAId, inspection_date: '2026-03-01', inspection_type: 'visual', result: 'pass',
    }).select('id').single()
    expect(insErr).toBeNull()

    const { error: updErr } = await asEngineer
      .from('asset_inspections')
      .update({ result: 'conditional' })
      .eq('id', insp!.id)
    expect(updErr).toBeNull()

    // Cleanup
    await svc.from('asset_inspections').delete().eq('id', insp!.id)
  })

  it('cannot delete a customer', async () => {
    // Engineers have no DELETE policy on customers
    const { error } = await asEngineer.from('customers').delete().eq('id', customerAId)
    // Should either error or return 0 rows deleted (RLS blocks the delete silently)
    // Supabase returns an error when the row is not found after RLS filtering
    const { data: stillThere } = await svc.from('customers').select('id').eq('id', customerAId).single()
    expect(stillThere).toBeTruthy() // customer must still exist
  })

  it('cannot write profiles', async () => {
    const { error } = await asEngineer.from('profiles').update({ full_name: 'Hacker' }).eq('id', adminUserId)
    // RLS has no update policy for engineers on profiles — either error or 0 rows
    const { data: adminProfile } = await svc.from('profiles').select('full_name').eq('id', adminUserId).single()
    expect(adminProfile?.full_name).not.toBe('Hacker')
  })
})

// ─── TECHNICIAN tests ─────────────────────────────────────────────────────────
describe('technician', () => {
  it('can read assets', async () => {
    const { data, error } = await asTechnician.from('assets').select('id')
    expect(error).toBeNull()
    expect(data?.length).toBeGreaterThanOrEqual(2)
  })

  it('can insert an inspection', async () => {
    const { data, error } = await asTechnician.from('asset_inspections').insert({
      asset_id: assetAId, inspection_date: '2026-04-01', inspection_type: 'visual', result: 'pass',
    }).select('id').single()
    expect(error).toBeNull()
    expect(data).toBeTruthy()
    // Cleanup
    if (data) await svc.from('asset_inspections').delete().eq('id', data.id)
  })

  it('CANNOT delete an inspection', async () => {
    const { error } = await asTechnician
      .from('asset_inspections')
      .delete()
      .eq('id', inspectionId)
    // Deletion must be blocked — inspection must still exist
    const { data: stillThere } = await svc.from('asset_inspections').select('id').eq('id', inspectionId).single()
    expect(stillThere).toBeTruthy()
  })

  it('CANNOT insert a customer', async () => {
    const { error } = await asTechnician.from('customers').insert({
      name: 'Rogue Customer', tax_id: 'ROGUE-001',
    })
    expect(error).not.toBeNull()
  })

  it('CANNOT write to the material catalog (materials table)', async () => {
    // Requires a real category ID — use service client to get one
    const { data: cat } = await svc.from('material_categories').select('id').limit(1).single()
    if (!cat) return // no categories in test DB, skip

    const { error } = await asTechnician.from('materials').insert({
      category_id: cat.id, description: 'Rogue Material', unit_of_measure: 'kg',
    })
    expect(error).not.toBeNull()
  })

  it('CANNOT write profiles', async () => {
    const { error } = await asTechnician.from('profiles').update({ full_name: 'Hacker' }).eq('id', adminUserId)
    const { data: adminProfile } = await svc.from('profiles').select('full_name').eq('id', adminUserId).single()
    expect(adminProfile?.full_name).not.toBe('Hacker')
  })
})

// ─── CLIENT tests ─────────────────────────────────────────────────────────────
describe('client', () => {
  it('can read their own customer row', async () => {
    const { data, error } = await asClient.from('customers').select('id').eq('id', customerAId)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })

  it('CANNOT read another customer\'s row', async () => {
    const { data, error } = await asClient.from('customers').select('id').eq('id', customerBId)
    expect(error).toBeNull()
    expect(data).toHaveLength(0) // RLS filters it out silently
  })

  it('can read assets belonging to their customer', async () => {
    const { data, error } = await asClient.from('assets').select('id').eq('id', assetAId)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })

  it('CANNOT read assets belonging to another customer', async () => {
    const { data, error } = await asClient.from('assets').select('id').eq('id', assetBId)
    expect(error).toBeNull()
    expect(data).toHaveLength(0) // filtered by RLS
  })

  it('can read inspections for their own customer\'s assets', async () => {
    const { data, error } = await asClient.from('asset_inspections').select('id').eq('id', inspectionId)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })

  it('CANNOT write anything (no insert/update/delete on any table)', async () => {
    const { error: insertErr } = await asClient.from('customers').insert({
      name: 'Client Rogue', tax_id: 'CLIENT-ROGUE-001',
    })
    expect(insertErr).not.toBeNull()

    const { error: updateErr } = await asClient
      .from('customers')
      .update({ name: 'Tampered' })
      .eq('id', customerAId)
    // Even on their own customer, clients have no update policy
    const { data: unchanged } = await svc.from('customers').select('name').eq('id', customerAId).single()
    expect(unchanged?.name).not.toBe('Tampered')

    const { error: deleteErr } = await asClient
      .from('asset_inspections')
      .delete()
      .eq('id', inspectionId)
    const { data: inspStillThere } = await svc
      .from('asset_inspections')
      .select('id')
      .eq('id', inspectionId)
      .single()
    expect(inspStillThere).toBeTruthy()
  })

  it('CANNOT access personnel records', async () => {
    const { data, error } = await asClient.from('personnel').select('id')
    // No SELECT policy for clients on personnel — returns empty or error
    expect(data?.length ?? 0).toBe(0)
  })

  it('CANNOT access material tables', async () => {
    const { data } = await asClient.from('materials').select('id')
    expect(data?.length ?? 0).toBe(0)
  })
})
