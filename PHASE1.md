# SCM Phase 1 — Foundation

## Objective
Establish the multi-company foundation for Security Compliance Manager.

## Data model
- `companies/{companyId}` — company profile and owner UID.
- `companies/{companyId}/members/{uid}` — membership and role.
- `companies/{companyId}/officers/{officerId}` — core officer identity/contact/employment record.

## Roles
- **owner** — full company administration.
- **admin** — manages company users and officer records.
- **viewer** — read-only company access.

## Acceptance criteria
- Firebase Hosting/Firestore configuration exists.
- Firestore rules isolate company data by membership.
- Authenticated users can create a company workspace.
- Company owners can create officer records.
- Dashboard displays company/officer records from Firestore.
- Public landing page remains the default entry point.

## Product boundary
SCM remains compliance-focused and its planned function list ends at **Rotas**. Attendance, patrols, welfare, incidents, operational reporting, payroll/invoicing and broader security operations remain ISS scope.
