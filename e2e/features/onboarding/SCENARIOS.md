# Smart-account onboarding: scenarios

One row per scenario. A test's title starts with the row's ID. Add a row here in the same pull
request that adds the feature or the test, and fill in the "Test" column when the row is automated.

- **Persona:** LO logged out, NEW fresh wallet without a profile, MEM member with a profile, LEG legacy
  wallet, MGR community manager, BM badge minter / burner / transferer, OBC official badge creator,
  GOV Governor badge holder, CW contract wallet. See `e2e/support/personas.ts` for what exists.
- **Needs:** W wallet connected, S signature, U sponsored user operation, T wallet transaction,
  R role, G subgraph, C chain read, I IPFS pin. (UF, "the Light Account pays its own gas", no longer
  exists: such writes are now paid by the owner wallet through the account, which is a T.)
- **Tag:** `@smoke`, `@core` or `@edge`.

The rows were imported from the planning inventory, which was read from the app before the
owner-pays routing change. Rows marked "review" describe the old behaviour ("needs ~X ETH",
a self-funded user operation): re-read `src/lib/outpost-routing.ts` before automating them.

Statuses in the "Test" column: a file name means automated and passing; **expected failure** means
the test runs, passes up to one marked assertion and is kept failing there by an app bug
(`test.fail`, with the reason next to it); **fixme** means written down but not runnable yet.

| ID | Scenario | Persona | Needs | Tag | Test |
|---|---|---|---|---|---|
| C1 | /profile logged out shows the connect bubble | LO | – | @smoke | `onboarding.spec.ts` |
| C2 | /profile with no profile shows "Setup your Account"; click opens the wizard, which names the Society address (the Light Account derived from the wallet, not the wallet) | NEW | W G C | @smoke | `onboarding.spec.ts` |
| C3 | Create profile end to end: name and bio, Review, Finish; two signatures, zero `eth_sendTransaction`; one sponsored `createProfile` user operation; toast; profile page shown; the pinned metadata is the on-chain URI | NEW | W S U I G C | @smoke | `onboarding.spec.ts` |
| C4 | First UserOp deploys the Light Account (factory in the op); a second save, an edit of the profile through `updateProfileURI`, is sponsored too and has no factory | NEW | W S U I G C | @core | `onboarding.spec.ts` (this is also the sponsored profile edit, D3's write) |
| C5 | Avatar upload: a valid image previews, is pinned by itself and shown on the profile | NEW | W S U I G C | @core | `onboarding-form.spec.ts` |
| C5 | Avatar upload: the review step shows the chosen picture | NEW | W | @core | `onboarding-form.spec.ts`: **expected failure**, the review card shows the placeholder (app bug: `resolveImageSrc` drops `data:` URIs) |
| C5 | Avatar upload: more than 2 MB, not an image, or an image type that is not allowed is refused with a message and blocks Next; exactly 2 MB passes; "Remove Photo" unblocks | NEW | W | @core | `onboarding-form.spec.ts` |
| C6 | Validation: name >100, bio >500; counters; Next disabled while a field is too long (the "Please fix the validation errors" toast cannot be reached: Next is disabled first) | NEW | W | @core | `onboarding-form.spec.ts` |
| C7 | Loading labels in order: "Uploading to IPFS...", "Signing transaction...", "Confirming transaction...", "Syncing..." | NEW | W S U I G C | @edge | `onboarding-failures.spec.ts`: each stage is held open (wallet prompts, the receipt read, the subgraph) |
| C8 | Reject the auth signature: "User rejected the request.", no upload, nothing sent, wizard still usable; Finish again succeeds | NEW | W S U I C | @core | `onboarding-failures.spec.ts` |
| C9 | Reject the UserOp signature after upload: error, no user operation and no wallet transaction; Finish again succeeds | NEW | W S U I C | @core | `onboarding-failures.spec.ts` |
| C10 | Legacy wallet connects: Society address shown; wizard prefilled from the old profile | LEG | W G | @core | `onboarding-legacy.spec.ts`; uses the `legacy` persona (a wallet of the pool the suite's build adds to the legacy map, see `src/lib/e2e-legacy-accounts.ts`) |
| C11 | Legacy member saves; `/user/<old wallet>` then redirects to the Society address | LEG | W S U I G | @core | `onboarding-legacy.spec.ts`, same persona; uses up one wallet of the pool per run |
| C12 | Wrong network on the wizard: the wizard is replaced by the switch prompt; declining the switch keeps the prompt; "Switch to Sepolia" asks the wallet and brings the wizard back | NEW | W | @edge | `onboarding-failures.spec.ts`: **expected failure** at the last step, what was typed is lost (app bug: the guard unmounts the wizard) |
| C13 | `/api/profile` returns 401 for an expired signature (device clock six minutes slow): "Message expired", no upload, no transaction; works once the clock is right | NEW | W S U I C | @edge | `onboarding-failures.spec.ts` (a signature by another key cannot be produced through the UI; the route's answer to it is P4 in `api/profile.api.spec.ts`) |
| C13 | `/api/profile` returns 500 (pinning fails): "Server error occurred. Please try again later.", no transaction; works once storage is back | NEW | W S U I C | @edge | `onboarding-failures.spec.ts` |
| C14 | Subgraph lags beyond 120 s: no success before the timeout, "Transaction successful!" after it | NEW | W S U G C | @edge | `onboarding-failures.spec.ts`: **expected failure** at the last step, the page then offers "Setup your Account" again although the profile exists (app bug: stale `useProfileId` and subgraph) |
| C15 | A member who comes back: connecting on /profile shows the profile, never the setup, also with `?setupOpen=true` and after a reload; nothing is signed or sent | MEM | W G C | @smoke | `onboarding.spec.ts` |
| C16 | The wizard open in the URL (`/profile?setupOpen=true`) stays open when a reload restores the connection and the wallet's identity settles; while the code is read no setup prompt is offered | NEW | W | @edge | `onboarding.spec.ts`: **expected failure**, `Profile.tsx` resets `setupOpen` when the connection or the address changes after mount and closes the wizard (the same reset undoes a click made just after connecting; `onboarding.start()` waits for the page's URL writes to settle and then clicks once) |
