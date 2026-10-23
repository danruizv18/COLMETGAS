# COLMETGAS INGENIERIA SAS — Management App

Next.js 15 + Supabase management system for LPG tank maintenance, gas network installations, pressure vessel manufacturing, and structural steel fabrication.

---

## Environment Setup

1. Verify `.env.local` has the three required variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>
```

2. Install dependencies:

```bash
npm install
```

---

## Migration Commands

Migrations live in `supabase/migrations/`. Apply them in order.

### Using Supabase CLI

```bash
npm install -g supabase
supabase link --project-ref jezcnfucnjaxmiulxemi
supabase db push
```

### Manually (SQL Editor in Supabase Dashboard)

Run each file in order:

1. `001_enums.sql`
2. `002_updated_at_trigger.sql`
3. `003_core_tables.sql`
4. `004_personnel.sql`
5. `005_inspections_documents.sql`
6. `006_materials.sql`
7. `007_work_orders_equipment.sql`
8. `008_rls.sql`
9. `009_storage.sql`

---

## Seed Command

After running all migrations, load the seed data in the SQL Editor:

```
File: supabase/seed.sql
```

Or via CLI:

```bash
supabase db reset --linked
```

The seed creates: 5 customers · 10 locations · 100 assets · 3 personnel · 15 inspections (6 overdue, 3 due within 30 days, 6 future).

---

## Dev Server

```bash
npm run dev
# → http://localhost:3000  (redirects to /admin)
```

---

## Test Commands

### Unit tests (Vitest)

```bash
npm test              # run once
npm run test:watch    # watch mode
```

### E2E tests (Playwright)

```bash
npx playwright install --with-deps chromium   # first time only
npm run test:e2e                               # headless
npm run test:e2e:ui                            # interactive UI
```

---

## Project Structure

```
src/
  app/
    admin/
      page.tsx              # Dashboard (3 stat cards)
      layout.tsx            # Admin shell with sidebar
      customers/
        page.tsx            # Customer list
        new/page.tsx        # Create customer
        [id]/page.tsx       # Customer detail + assets
        [id]/edit/page.tsx  # Edit customer
      assets/
        page.tsx            # Asset list with type/status/customer filters
        new/page.tsx        # Create asset
        [id]/page.tsx       # Asset detail + inspection history
        [id]/edit/page.tsx  # Edit asset
  components/
    admin/sidebar.tsx
    customers/customer-form.tsx
    assets/asset-form.tsx
  lib/
    database.types.ts       # TypeScript types matching the schema
    supabase/
      browser.ts            # Browser Supabase client
      server.ts             # Server + service-role clients
    actions/
      customers.ts          # Server Actions: create / update / delete
      assets.ts             # Server Actions: create / update
supabase/
  migrations/               # 9 migration files
  seed.sql                  # 100 assets + 15 inspections
```

---

## 5-Step Manual Smoke Test

1. **Dashboard loads** — open `http://localhost:3000`. Redirects to `/admin`. After seeding: "Activos Activos" = 91, "Inspecciones Vencidas" = 6, "Inspecciones en 30 días" = 3.

2. **Customer list** — click "Clientes" in the sidebar. Five Colombian companies appear with their NITs and location count.

3. **Create a customer** — click "Nuevo Cliente", fill Razón Social + NIT, submit. Redirects to list; new entry appears.

4. **Asset list with filters** — click "Activos". All 100 assets. Click "Tanque Est." badge → 30 results. Click "Fuera de Servicio" → only out-of-service assets.

5. **Asset detail + inspections** — click the chevron on any asset. Detail page shows metadata cards and inspection history table. Overdue `next_due_date` values appear in red with ⚠.
