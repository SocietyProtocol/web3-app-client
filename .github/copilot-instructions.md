# GitHub Copilot Code Review Instructions

## Project Overview

This is a Next.js 14+ application for the Society Protocol, built with TypeScript, React, Material-UI (MUI), wagmi for Web3 interactions, and Jotai for state management.

## Code Review Focus Areas

### TypeScript

- Ensure all functions have proper type annotations
- Avoid using `any` types; use proper typing or `unknown` with type guards
- Prefer interfaces for object shapes and types for unions/primitives
- Use strict TypeScript settings; no implicit any
- Utilize utility types (Partial, Pick, Omit, etc.) where appropriate

### React & Next.js

- Use functional components with hooks exclusively
- Prefer server components by default; only use "use client" when necessary
- Follow Next.js App Router conventions (app directory structure)
- Ensure proper error boundaries are in place
- Use Suspense boundaries for loading states
- Implement proper SEO with metadata exports
- Keep components focused and single-responsibility

### Component Structure

- Keep components small and composable (< 200 lines ideally)
- Extract complex logic into custom hooks
- Use proper file organization (components in folders with index.ts)
- Follow naming conventions: PascalCase for components, camelCase for utilities
- Co-locate related files (component, styles, tests)

### State Management

- Use Jotai atoms for global state
- Keep local state in components when possible
- Avoid prop drilling; use context or atoms for deep state
- Ensure atoms are properly typed
- Use atom families for dynamic collections

### Web3 & wagmi

- Always handle wallet connection states
- Implement proper error handling for contract interactions
- Check for correct network before transactions
- Use proper types from wagmi and viem
- Handle loading and error states for all hooks
- Validate addresses and contract inputs

### Material-UI

- Use the theme system consistently
- Avoid inline styles; use sx prop or styled components
- Follow theme spacing units (theme.spacing)
- Ensure responsive design with breakpoints
- Use proper MUI component variants and props
- Maintain accessibility (ARIA labels, roles)

### Error Handling

- Implement custom error classes (see errors/ directory)
- Use ErrorBoundary components appropriately
- Provide user-friendly error messages
- Log errors appropriately for debugging
- Handle async errors with try-catch
- Validate user inputs and external data

### Performance

- Implement proper code splitting and lazy loading
- Memoize expensive computations with useMemo
- Memoize callbacks with useCallback when passed to children
- Avoid unnecessary re-renders
- Optimize images (use Next.js Image component)
- Implement proper loading states and skeletons

### Code Quality

- Follow DRY principles; extract reusable logic
- Write self-documenting code with clear names
- Add comments only when necessary (why, not what)
- Keep functions pure when possible
- Avoid deep nesting (max 3 levels)
- Use early returns to reduce complexity

### Testing

- Write unit tests for utilities and hooks
- Test error cases and edge cases
- Mock external dependencies (wagmi, APIs)
- Ensure components render without crashing
- Test user interactions and state changes

### Security

- Never expose private keys or sensitive data
- Validate all user inputs
- Sanitize data before rendering
- Use proper CORS and CSP headers
- Implement rate limiting for API routes
- Validate contract addresses and parameters

### Accessibility

- Use semantic HTML elements
- Provide proper ARIA labels and roles
- Ensure keyboard navigation works
- Maintain proper heading hierarchy
- Provide alternative text for images
- Ensure sufficient color contrast

### Git & Code Organization

- Keep commits atomic and focused
- Write clear, descriptive commit messages
- Keep PR changes focused on single feature/fix
- Update documentation when changing APIs
- Clean up console.logs and debug code

## Review Checklist

When reviewing code, ensure:

- [ ] TypeScript types are properly defined
- [ ] No console.logs or debug code remains
- [ ] Error handling is implemented
- [ ] Loading and empty states are handled
- [ ] Mobile responsiveness is maintained
- [ ] Accessibility requirements are met
- [ ] Code follows project conventions
- [ ] No performance regressions
- [ ] Tests are updated/added
- [ ] Documentation is current

## Common Patterns in This Project

### Custom Hooks

- `useProfile`: Fetches and manages user profile data
- `useAuth`: Manages authentication state
- `useCheckWrongNetwork`: Validates network connection
- `useIsMobile`: Responsive design helper

### State Atoms

- `wagmiReady`: Tracks wagmi initialization state
- Use Jotai atoms for cross-component state

### Component Patterns

- Wizard pattern for multi-step flows
- Bubble components for user guidance
- Skeleton loaders for loading states
- Error boundaries for error isolation

### Styling Approach

- MUI theme customization in theme/ directory
- Component-level overrides in theme/components/
- sx prop for one-off styles
- Responsive design with theme.breakpoints

## Questions to Ask During Review

1. Is this the simplest solution?
2. Does this follow existing patterns?
3. Is error handling comprehensive?
4. Will this work on mobile?
5. Is the component/function testable?
6. Could this cause performance issues?
7. Is the code accessible?
8. Are types properly defined?
9. Does this handle edge cases?
10. Is the user experience smooth?
