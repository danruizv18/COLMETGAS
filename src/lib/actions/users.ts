'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/supabase/get-profile'
import type { UserRole } from '@/lib/database.types'

const VALID_ROLES: UserRole[] = ['admin', 'engineer', 'technician', 'client']

export async function updateUserRole(formData: FormData): Promise<void> {
  // Server-side admin check: even though the UI is hidden from non-admins,
  // always re-verify the caller's role before writing.
  const callerProfile = await getProfile()
  if (!callerProfile || callerProfile.role !== 'admin') {
    throw new Error('Forbidden')
  }

  const userId = formData.get('userId') as string
  const role = formData.get('role') as UserRole

  if (!userId || !VALID_ROLES.includes(role)) {
    throw new Error('Invalid input')
  }

  const supabase = await createServiceClient()
  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', userId)

  if (error) throw new Error(error.message)

  revalidatePath('/admin/users')
}
