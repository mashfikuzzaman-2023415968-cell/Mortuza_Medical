# MDC Web Portal — Frontend

React 19 + Vite 5 + Tailwind CSS v4 single-page app for the Mortuza Medical Centre
Management System (MMCMS).

> **📖 Full project documentation lives in the [root README](../README.md)** — architecture,
> database design, API reference, setup, design system and troubleshooting.

## Quick start

From the **project root** (recommended — starts the API and this app together):

```bash
make run        # backend :5000 + frontend :5173
```

Or run just the frontend from this directory:

```bash
npm install
npm run dev     # http://localhost:5173
```

The API must be running on `:5000` (`make backend` from the root) or this app will show
network errors.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server with HMR (port 5173) |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the built `dist/` locally |
| `npm run lint` | ESLint |

## Configuration

`client/.env`:

```
VITE_API_URL=http://localhost:5000/api
```

## Layout

```
src/
├── main.jsx          # AuthProvider + ThemeProvider + router
├── App.jsx           # Routes, ProtectedRoute / PublicOnlyRoute
├── index.css         # Design system: typography, dark palette, motion, print rules
├── api/axios.js      # Bearer-JWT interceptor + 401 session handling
├── config/roles.js   # ROLES, NAV and role gradients — single source of truth
├── context/          # AuthContext, ThemeContext
├── hooks/            # usePatientPhoto
├── components/       # ui.jsx primitives, DashboardLayout, ChatWidget, QueueBoard,
│                     # CommandPalette, toast, ConfirmDialog, print modals
└── pages/            # LoginPage, DashboardHome + one folder per role
```

## Notes for contributors

- **Dark mode** is class-based (`.dark` on `<html>`), styled via CSS overrides in
  `index.css` — *not* `dark:` utilities. Add new dark styling there.
- **Fonts** are loaded via `<link>` in `index.html`, not a CSS `@import` (browsers ignore
  `@import` after Tailwind's expansion).
- **Charts**: PostgreSQL returns integers as strings and Recharts won't plot strings —
  always `Number()`-coerce chart series.
- **Motion** must degrade under `prefers-reduced-motion`; follow the existing patterns.
- **Print views**: see §2.7 of the root README before adding one — there are real
  animation/`display:none` traps that produce blank pages.
