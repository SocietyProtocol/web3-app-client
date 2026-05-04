# Copilot Instructions — Society Protocol

## Assumptions (Use Unless User Explicitly Overrides)

- Stack: Next.js 14+ App Router, TypeScript (strict), React
- UI: MUI v7
- Web3: wagmi + viem + RainbowKit
- Global State: Jotai
- Environment: modern browsers only

---

## Response & Conversation Style

- Be concise by default
- Prefer code over explanation
- No restating assumptions
- No summaries unless requested
- No clarification questions unless ambiguity blocks correctness
- Use bullet points over prose
- Avoid repetition across turns

---

## Component Structure

- Small, composable components (<200 LOC)
- One main component per file
- Clear props interface
- Separate logic & UI when complex
- Logic in custom hooks
- PascalCase components
- camelCase utilities
- Co-locate related files

---

## Data Hooks Pattern

List/table hooks (e.g. `useBadges`, `useCommunities`, `useCommunityMembers`) follow this standard:

- The hook owns **all** search/sort/filter/pagination state
- Use `useQueryState` (nuqs) for URL-persisted state; `useState` for local-only state
- Debounce search with `useDebounceValue` inside the hook (not in the component)
- Expose a pure `fetch*` function alongside the hook for direct calls
- Build query variables in a separate `buildVariables` (or `mergeOptions`) helper
- Return `{ ...queryResult, search, sort, setSearch, setSort, ... }` — components just destructure
- `queryKey` must include all variables that affect the result

---

## Search & Sort UI Pattern

- Use `FilterSelect` component (from `@/components/FilterSelect/FilterSelect`) for sort/filter dropdowns — **not** raw `Select`
- Prefer the shared `SearchBox` component for search inputs — **not** a raw `TextField` with a `SearchIcon` adornment
- Controls layout: `Box` with `display: flex`, `flexDirection: { xs: "column", md: "row" }`, `gap: 2`; search grows with `minWidth: { xs: "100%", md: 300 }`
- Define sort/filter options as `FilterSelectOption[]` in `consts.ts`, not inline in the component
- Reset pagination to page 1 whenever search or sort changes

---

## State Management

- Jotai atoms for shared state
- Local state when possible
- No prop drilling for deep state
- Typed atoms only
- atomFamily for collections

---

## Web3 (wagmi / viem)

- Always handle: loading, error, disconnected, wrong network
- Validate addresses & inputs
- Network check before transactions
- Use wagmi/viem types only

---

## MUI

- Theme-first
- `sx` or `styled` only (no inline styles)
- Use theme spacing & breakpoints
- Correct variants & props
- Accessibility required
- All colors should come from the theme

---

## Error Handling

- Custom error classes (`errors/`)
- User-friendly messages
- try/catch async logic
- Validate all external/user input

---

## Performance

- Code splitting & lazy loading
- useMemo for expensive values
- useCallback for child props
- Avoid unnecessary re-renders
- Next.js Image
- Skeleton loaders

---

## Security

- Never expose secrets
- Sanitize rendered data
- Validate all inputs
- Rate limit API routes
- Validate contract params

---

## Accessibility

- Semantic HTML
- ARIA labels & roles
- Keyboard navigation
- Heading hierarchy
- Alt text
- Sufficient contrast
