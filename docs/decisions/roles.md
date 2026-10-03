# Decision Record: User Roles & "Both" Option

## Context
The platform needs to support users acting as freelancers, clients, or potentially both. The existing system uses a single `users` table with two columns:
- `role`: System-level permission (`admin` or `customer`)
- `active_role`: The user's current active marketplace mode (`freelancer` or `customer`).

The requirements ask whether we should change `role` to `admin | freelancer | client`, and how to handle a user wanting to be "both".

## Decision
We will **NOT** change `role` to strictly `admin | freelancer | client` in a mutually exclusive way, because a user can be BOTH a client and a freelancer using a single account.

Instead, we will formalize the **Active Role Switcher** pattern that partially exists:
1. System `role` will remain `admin` and `user` (renaming `customer` to `user` at the system level to avoid confusion).
2. The `active_role` column will toggle between `freelancer` and `client` (renamed from `customer` to `client` to reflect industry standard terminology).

## Rationale
- **Single Account:** Users shouldn't need two email addresses to hire someone and also work as a freelancer. 
- **Authorization:** Route guards and RLS policies can cleanly check `active_role === 'client'` for client-only actions (like posting a job) and `active_role === 'freelancer'` for freelancer-only actions (like submitting a proposal).
- **Simplicity:** We avoid complex pivot tables (`user_roles`) by storing the active state directly on the `users` table, which maps 1:1 with the JWT metadata for fast stateless auth checks.

## Trade-offs
- The user must explicitly switch profiles in the UI to perform actions for the other role.
- Profile data (bio, avatar) must be duplicated or scoped (e.g., `client_bio` vs `bio`) in the users table so their freelancer profile doesn't bleed into their client persona. (This is already partially implemented).
