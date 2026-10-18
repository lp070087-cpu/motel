# MOTEL development rules
- Demonstration only. Do not deploy or connect real payments/messages without explicit user authorization. GitHub publication to https://github.com/lp070087-cpu/motel.git was explicitly authorized on 2026-10-18; never force-push or overwrite remote history.
- Next.js App Router + TypeScript. Shared domain in lib/store.ts and lib/domain.ts.
- All operational changes go through domain actions; never mutate UI snapshots.
- Money represented as BRL numeric values, formatted consistently. Transactions idempotent by state guards.
- All units, guests and staff are fictitious. Architectural map is illustrative.
- Graphite, ivory, champagne; editorial serif headings with precise sans-serif controls. Responsive and accessible.
- Keep each delegated module in assigned files. Check typecheck, production build and meaningful domain journeys.
- Demo role access is a simulation, never production authentication. Guest access bound to active stay token.
