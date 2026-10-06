# Regression Guardrails

The merged Phase 1 authentication/workspace flow is a protected baseline.

Every pull request to `main` runs the regression suite. A change is not considered ready to merge when these checks fail.

Protected contracts:
- branded SIA Compliance Manager auth card and `favi.png`
- email/password sign-in and account creation wiring
- Google sign-in wiring
- sign-out clears protected workspace UI
- authenticated state loads the company workspace
- company membership/user mapping remains wired
- officer persistence remains wired

These tests are deliberately lightweight and dependency-free. They guard the known-good application contracts without changing Firebase authentication or Firestore behaviour. Live Firebase verification remains required for changes that alter authentication, Firestore rules, or persistence.
