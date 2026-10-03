# SAFE IMPLEMENTATION MASTER RULES

You are working on an existing full-stack application.

Your task is to implement the requested features **safely and incrementally** without breaking any existing functionality.

## CRITICAL RULE

The existing application is already working.

**DO NOT rewrite, refactor, reorganize, or replace existing working features unless absolutely required for the requested feature.**

The implementation must be **additive-first**.

Your priority order is:

1. Preserve all existing functionality.
2. Implement the requested features.
3. Minimize modifications to existing code.
4. Reuse existing architecture and conventions.
5. Verify every change before moving to the next feature.
6. Keep every change easy to revert.

---

## 1. GIT / BRANCH SAFETY

Work ONLY on the current `Missingfeatures` branch.

Before making changes:

```bash
git branch --show-current
git status
git log --oneline -5
```

Confirm that the current branch is `Missingfeatures`.

### NEVER:

- Switch to `main`
- Checkout another branch
- Merge into `main`
- Push directly to `main`
- Reset the repository
- Use destructive git commands
- Delete existing working files
- Overwrite unrelated work

If the current branch is not `Missingfeatures`, STOP and tell me. Do not automatically switch branches.

---

## 2. INSPECT BEFORE CODING

Before writing any code, inspect the repository and understand:

- Frontend framework
- Backend framework
- Database
- API architecture
- Authentication system
- Existing routing, controllers, services
- Existing contexts/state management
- Existing CSS architecture

---

## 3. COMMIT PER FEATURE

After each feature is fully working, create a separate git commit. Do NOT batch all changes into one commit. This makes individual features revertable.

---

## 4. VERIFY BEFORE NEXT

After each feature:

- Run `npm run build` in frontend/
- Start the backend and confirm no crash
- Do NOT start the next feature until the current one passes

---

## 5. MATCH EXISTING PATTERNS

- Match the existing code style exactly.
- If the project uses `require()`, do NOT use `import`.
- If controllers use `async (req, res) => {}`, use that same pattern.
- Do NOT introduce new libraries without asking first.

---

## 6. EXISTING FILE MODIFICATION RULES

When modifying an existing file:

- Add new code at the end of existing code blocks where possible.
- Do NOT rearrange imports, reformat code, or rename variables.
- Do NOT remove comments or modify unrelated lines.
