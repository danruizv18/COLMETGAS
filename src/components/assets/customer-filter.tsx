'use client'

export function CustomerFilter({
  customers,
  value,
}: {
  customers: { id: string; name: string }[]
  value: string
}) {
  return (
    <select
      className="text-sm border rounded px-2 py-0.5 bg-background"
      defaultValue={value}
      onChange={(e) => {
        const v = e.target.value
        window.location.href = v ? `/admin/assets?customer=${v}` : '/admin/assets'
      }}
    >
      <option value="">Todos los clientes</option>
      {customers.map((c) => (
        <option key={c.id} value={c.id}>{c.name}</option>
      ))}
    </select>
  )
}
