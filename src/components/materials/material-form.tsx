'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Material, MaterialCategory } from '@/lib/database.types'
import type { MaterialFormState } from '@/lib/actions/materials'

interface Props {
  action: (prev: MaterialFormState, data: FormData) => Promise<MaterialFormState>
  defaultValues?: Partial<Material>
  categories: Pick<MaterialCategory, 'id' | 'name'>[]
  submitLabel?: string
}

export function MaterialForm({ action, defaultValues, categories, submitLabel = 'Guardar' }: Props) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(action, {})

  useEffect(() => {
    if (state.message === 'ok') router.push('/admin/materials')
  }, [state.message, router])

  return (
    <form action={formAction} className="space-y-4 max-w-2xl">
      {state.message && state.message !== 'ok' && (
        <p className="text-sm text-destructive rounded-md bg-destructive/10 p-3">{state.message}</p>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-1.5">
          <Label>Categoría *</Label>
          <Select name="category_id" defaultValue={defaultValues?.category_id}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar categoría" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {state.errors?.category_id && (
            <p className="text-xs text-destructive">{state.errors.category_id[0]}</p>
          )}
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="unit_of_measure">Unidad de Medida *</Label>
          <Input
            name="unit_of_measure"
            id="unit_of_measure"
            defaultValue={defaultValues?.unit_of_measure}
            placeholder="kg, m, unid, pulg..."
          />
          {state.errors?.unit_of_measure && (
            <p className="text-xs text-destructive">{state.errors.unit_of_measure[0]}</p>
          )}
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="description">Descripción *</Label>
        <Input
          name="description"
          id="description"
          defaultValue={defaultValues?.description}
          placeholder="Plancha de acero ASTM A516"
        />
        {state.errors?.description && (
          <p className="text-xs text-destructive">{state.errors.description[0]}</p>
        )}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="specification">Especificación</Label>
        <Input
          name="specification"
          id="specification"
          defaultValue={defaultValues?.specification ?? ''}
          placeholder="ASTM A516 Gr 70, AWS A5.1 E7018..."
        />
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? 'Guardando...' : submitLabel}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
