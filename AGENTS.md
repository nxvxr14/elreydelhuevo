# AGENTS.md - Coding Agent Guidelines

## Project Overview

**EL REY DEL HUEVO** - POS and Inventory Management System  
A Point of Sale (POS) system built with React + TypeScript frontend and InsForge (PostgreSQL) backend.

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS v3.4 + shadcn/ui
- **Backend**: InsForge (PostgreSQL + Auth + RLS + DB functions) — no Node/Express server
- **Database**: PostgreSQL via InsForge (13 tables with RLS policies)
- **Currency**: Colombian Pesos ($) - NO decimals, use thousands separators (e.g., `$ 1.500.000`)
- **Timezone**: America/Bogota

---

## Build/Run Commands

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:3430)
npm run dev

# Type-check + production build
npm run build

# Preview production build
npm run preview

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Lint
npm run lint
```

---

## Project Structure

```
/
├── package.json
├── vite.config.ts              # Vite + Vitest config
├── tsconfig.json
├── tsconfig.app.json
├── tailwind.config.js          # Tailwind v3.4 dark theme
├── postcss.config.js
├── index.html                  # SPA entry point
├── vercel.json                 # Vercel SPA rewrites
├── .env                        # VITE_INSFORGE_URL, VITE_INSFORGE_ANON_KEY (gitignored)
├── AGENTS.md
├── public/
│   ├── favicon.svg
│   └── icons.svg
└── src/
    ├── main.tsx                # React entry point
    ├── App.tsx                 # Router + AuthProvider
    ├── index.css               # Tailwind base + custom theme
    ├── types/index.ts          # TypeScript interfaces (all DB models)
    ├── lib/
    │   ├── insforge.ts         # InsForge client singleton
    │   ├── utils.ts            # formatCurrency, parseNumber, quantity helpers, date utils
    │   ├── utils.test.ts       # 50+ unit tests for utils
    │   ├── constants.ts        # EXIT_REASONS, PAYMENT_METHODS, TRANSFER_TYPES, etc.
    │   └── constants.test.ts   # Constants validation tests
    ├── contexts/
    │   └── AuthContext.tsx      # Auth state, login/logout, role-based access
    ├── components/
    │   ├── layout/
    │   │   ├── Sidebar.tsx     # Navigation sidebar with role-based menu
    │   │   └── MainLayout.tsx  # Sidebar + content wrapper
    │   └── ui/                 # shadcn/ui components (13)
    │       ├── button.tsx
    │       ├── input.tsx
    │       ├── card.tsx
    │       ├── badge.tsx
    │       ├── dialog.tsx
    │       ├── select.tsx
    │       ├── label.tsx
    │       ├── table.tsx
    │       ├── textarea.tsx
    │       ├── toast.tsx
    │       ├── loading.tsx
    │       ├── confirm-dialog.tsx
    │       └── pagination.tsx
    └── pages/                  # 13 page components
        ├── LoginPage.tsx
        ├── DashboardPage.tsx   # Metrics, charts (recharts), alerts
        ├── POSPage.tsx         # Product grid, cart, cash register, quick expense
        ├── ProductsPage.tsx    # CRUD + stock by warehouse
        ├── CategoriesPage.tsx  # CRUD simple
        ├── ClientsPage.tsx     # CRUD + debt stats
        ├── SalesPage.tsx       # List + filters + manual sale
        ├── ExpensesPage.tsx    # CRUD + date filters
        ├── InventoryPage.tsx   # Entry/exit/transfer/exchange movements
        ├── CashRegisterPage.tsx # Open/close sessions, history
        ├── WarehousesPage.tsx  # CRUD + default warehouse protection
        ├── PortfolioPage.tsx   # Client debts, FIFO payments
        └── ReportsPage.tsx     # 8 report types with sub-components
```

---

## Code Style Guidelines

### TypeScript

1. **Imports**: Use ES modules with path aliases
   ```typescript
   import { insforge } from '@/lib/insforge'
   import { formatCurrency } from '@/lib/utils'
   import type { Product, Sale } from '@/types'
   ```

2. **Naming Conventions**:
   - Files: `PascalCase.tsx` for components, `camelCase.ts` for utilities
   - Components: PascalCase function components
   - Hooks: `use` prefix (e.g., `useAuth`, `useToast`)
   - Types/Interfaces: PascalCase
   - Constants: UPPER_SNAKE_CASE

3. **Component Pattern**: Functional components with hooks
   ```tsx
   export function ProductsPage() {
     const [products, setProducts] = useState<Product[]>([])
     const { showToast } = useToast()
     // ...
   }
   ```

4. **InsForge SDK Pattern**:
   ```typescript
   // Select with join
   const { data, error } = await insforge.from('products')
     .select('*, categories(name)')
     .order('name')

   // Insert (always array)
   const { error } = await insforge.from('products')
     .insert([{ name, price, category_id }])

   // Update
   const { error } = await insforge.from('products')
     .update({ name, price })
     .eq('id', productId)

   // Delete (admin only via RLS)
   const { error } = await insforge.from('products')
     .delete()
     .eq('id', productId)

   // RPC (database functions)
   const { error } = await insforge.rpc('process_pos_sale', {
     p_items: items, p_client_id: clientId, ...
   })
   ```

### CSS / Tailwind

- Use Tailwind utility classes + shadcn/ui components
- Theme uses HSL CSS variables defined in `index.css`
- Dark theme by default (no light mode toggle)
- Key colors: primary (amber/gold), background (dark slate), destructive (red), success (green)

---

## Database (InsForge / PostgreSQL)

### Tables (13)
`profiles`, `categories`, `warehouses`, `products`, `product_stock`, `clients`, `sales`, `sale_items`, `expenses`, `inventory_movements`, `cash_registers`, `payments`, `payment_allocations`

### RLS Policies
- All tables: SELECT/INSERT/UPDATE for `authenticated` role
- DELETE: only for users with `admin` role in `profiles` table
- Vendedor role cannot delete any records

### Database Functions (RPC)
- `generate_reference(prefix)` — unique ID like "V17098234561234"
- `process_pos_sale(...)` — atomic POS sale (stock, sale, items, cash register)
- `process_manual_sale(...)` — dashboard/manual sale (no cash register)
- `process_credit_payment(...)` — FIFO payment allocation
- `process_inventory_entry/exit/transfer/exchange(...)` — inventory movements
- `reverse_sale(...)` / `reverse_payment(...)` / `reverse_inventory_movement(...)` — reversals

---

## Authentication

- **InsForge Auth** (email/password, no registration)
- Two pre-created users:
  - `admin@elreydelhuevo.com` / `Admin2024!` — role `admin`, all permissions
  - `vendedor@elreydelhuevo.com` / `Venta2024!` — role `vendedor`, no DELETE
- No global password for edit/delete — admin can delete directly, vendedor sees no delete button

---

## Business Rules

1. **No decimals in currency** — Always use `Math.round()`
2. **Colombian locale** — Use `es-CO` for number formatting
3. **Quantity validation** — Only integers or `.5` (e.g., 3, 3.5, not 3.2)
4. **POS vs Dashboard sales** — POS sales affect cash register; dashboard sales don't
5. **Cash register** — Must be open for POS sales/expenses
6. **Credit sales** — Don't count as income; only payments (abonos) do
7. **FIFO payments** — Applied to oldest debt first
8. **Stock by warehouse** — POS only shows/sells from default warehouse
9. **Daily report** — Consolidates: cash/transfer sales + cash/transfer payments, by transfer type
10. **Exit reasons**: waste, cracked, adjustment, gift_rodrigo (Obsequio Rodrigo)
11. **Transfer types**: Nequi, Bancolombia, Davivienda
12. **Dark theme** — All UI uses dark color scheme
13. **Mobile responsive** — Tailwind responsive classes
