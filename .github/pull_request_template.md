## What changed and why


## Browser tests

For a change to what users can do in the app. The full definition of done is in
`e2e/README.md`. Delete this section for changes that cannot affect behaviour (docs,
comments, tooling).

- [ ] The scenarios are rows in the area's `e2e/features/<area>/SCENARIOS.md`
- [ ] At least one `@smoke` happy path and one failure or guard path run in the `hermetic` project
- [ ] Every new write asserts the wallet's request log and a chain read
- [ ] A new persisted query, role or contract comes with what the fakes need (builder, seed step, handler)
- [ ] New controls have an accessible name or a `data-testid`
- [ ] No sleeps and no CSS-structure locators
- [ ] `yarn lint`, `yarn type-check` and `yarn test:e2e` pass locally
