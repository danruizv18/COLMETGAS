import type { InspectionResult, InspectionType } from '@/lib/database.types'

export interface InspectionEmailData {
  customerName: string
  assetTag: string
  serialNumber: string | null
  locationName: string | null
  locationCity: string | null
  locationDepartment: string | null
  inspectionDate: string
  inspectionType: InspectionType
  result: InspectionResult
  nextDueDate: string | null
}

const INSPECTION_TYPE_LABELS: Record<InspectionType, string> = {
  visual: 'Visual',
  ultrasound: 'Ultrasonido',
  hydrostatic: 'Hidrostática',
  full_maintenance: 'Mantenimiento Completo',
}

const RESULT_LABELS: Record<InspectionResult, string> = {
  pass: 'Aprobado',
  fail: 'Reprobado',
  conditional: 'Condicional',
}

export function shouldNotify(result: InspectionResult): boolean {
  return result === 'fail' || result === 'conditional'
}

export function buildInspectionEmail(data: InspectionEmailData): {
  subject: string
  body: string
} {
  const assetId = data.serialNumber
    ? `${data.assetTag} (S/N: ${data.serialNumber})`
    : data.assetTag

  const locationParts = [data.locationName, data.locationCity, data.locationDepartment].filter(
    Boolean,
  )
  const locationStr = locationParts.length > 0 ? locationParts.join(', ') : 'No registrada'

  const typeLabel = INSPECTION_TYPE_LABELS[data.inspectionType]
  const resultLabel = RESULT_LABELS[data.result]

  const subject = `COLMETGAS – Hallazgo en activo ${data.assetTag} | Inspección ${typeLabel}`

  const lines = [
    `Estimado(a) ${data.customerName},`,
    '',
    'Por medio del presente comunicado, COLMETGAS INGENIERÍA SAS le informa que el activo',
    'identificado a continuación presentó un hallazgo en su inspección más reciente.',
    '',
    'INFORMACIÓN DEL ACTIVO',
    `  Identificación: ${assetId}`,
    `  Ubicación:      ${locationStr}`,
    '',
    'RESULTADO DE LA INSPECCIÓN',
    `  Fecha:            ${data.inspectionDate}`,
    `  Tipo:             ${typeLabel}`,
    `  Resultado:        ${resultLabel}`,
  ]

  if (data.nextDueDate) {
    lines.push(`  Próxima revisión: ${data.nextDueDate}`)
  }

  lines.push(
    '',
    'Un representante de COLMETGAS se pondrá en contacto con usted en los próximos días',
    'para coordinar las acciones correspondientes.',
    '',
    'Quedamos a su disposición para cualquier consulta.',
    '',
    'Atentamente,',
    'COLMETGAS INGENIERÍA SAS',
    'notificaciones@colmetgasingenieria.com',
  )

  return { subject, body: lines.join('\n') }
}
