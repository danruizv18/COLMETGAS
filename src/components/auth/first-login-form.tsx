'use client'

import { useActionState } from 'react'
import { completeFirstLogin } from '@/lib/actions/first-login'

const inputClass =
  'w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

export function FirstLoginForm({ email, defaultName }: { email: string; defaultName: string }) {
  const [state, action, pending] = useActionState(completeFirstLogin, {})

  return (
    <form action={action} className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Usuario (correo)</label>
        <input value={email} disabled readOnly className={`${inputClass} opacity-70`} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="full_name" className="text-sm font-medium">Nombre completo</label>
        <input id="full_name" name="full_name" required defaultValue={defaultName} className={inputClass} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="phone" className="text-sm font-medium">Teléfono</label>
        <input id="phone" name="phone" type="tel" required className={inputClass} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="text-sm font-medium">Nueva contraseña</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={inputClass}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="confirm" className="text-sm font-medium">Confirmar contraseña</label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={inputClass}
        />
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
      >
        {pending ? 'Guardando…' : 'Guardar y continuar'}
      </button>
    </form>
  )
}
