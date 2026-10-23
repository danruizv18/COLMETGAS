'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/browser'
import type { BatchFormState } from '@/lib/actions/materials'

interface Props {
  action: (prev: BatchFormState, data: FormData) => Promise<BatchFormState>
  materialId: string
}

export function BatchForm({ action, materialId }: Props) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(action, {})
  const [mtrPath, setMtrPath] = useState<string | null>(null)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')

  useEffect(() => {
    if (state.message === 'ok') router.refresh()
  }, [state.message, router])

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadStatus('uploading')
    const supabase = createClient()
    const safeName = file.name.replace(/[^a-z0-9._-]/gi, '_')
    const path = `mtrs/${materialId}/${Date.now()}_${safeName}`

    const { error } = await supabase.storage.from('documents').upload(path, file)
    if (error) {
      setUploadStatus('error')
    } else {
      setMtrPath(path)
      setUploadStatus('done')
    }
  }

  return (
    <form action={formAction} className="space-y-4">
      {state.message && state.message !== 'ok' && (
        <p className="text-sm text-destructive rounded-md bg-destructive/10 p-3">{state.message}</p>
      )}

      <input type="hidden" name="material_id" value={materialId} />
      {mtrPath && <input type="hidden" name="mtr_file_path" value={mtrPath} />}

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="batch_number">Número de Lote *</Label>
          <Input name="batch_number" id="batch_number" placeholder="LOTE-2026-001" />
          {state.errors?.batch_number && (
            <p className="text-xs text-destructive">{state.errors.batch_number[0]}</p>
          )}
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="heat_number">Número de Colada (Heat)</Label>
          <Input name="heat_number" id="heat_number" placeholder="H-2026-001" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="supplier">Proveedor</Label>
          <Input name="supplier" id="supplier" placeholder="Aceros del Norte S.A." />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="received_date">Fecha de Recepción</Label>
          <Input name="received_date" id="received_date" type="date" />
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="quantity">Cantidad Recibida *</Label>
        <Input name="quantity" id="quantity" type="number" step="0.001" min="0.001" placeholder="0.000" />
        {state.errors?.quantity && (
          <p className="text-xs text-destructive">{state.errors.quantity[0]}</p>
        )}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="mtr_file">MTR (Mill Test Report)</Label>
        <Input
          id="mtr_file"
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleFileChange}
          disabled={uploadStatus === 'uploading'}
        />
        {uploadStatus === 'uploading' && (
          <p className="text-xs text-muted-foreground">Subiendo archivo...</p>
        )}
        {uploadStatus === 'done' && (
          <p className="text-xs text-green-600">Archivo subido correctamente.</p>
        )}
        {uploadStatus === 'error' && (
          <p className="text-xs text-destructive">Error al subir el archivo. Intente de nuevo.</p>
        )}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="notes">Notas</Label>
        <Textarea name="notes" id="notes" rows={2} placeholder="Observaciones del lote" />
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={pending || uploadStatus === 'uploading'}>
          {pending ? 'Guardando...' : 'Registrar Lote'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
