# SCM invitation email delivery

SCM now writes invitation messages to the Firestore `mail` collection using the schema expected by Firebase's Trigger Email extension.

## One-time production setup

Install the official Firebase **Trigger Email from Firestore** extension in project `sia-licence-compliance-manager` and configure it to watch the `mail` collection.

The extension requires an SMTP provider/account. Configure the sender address and SMTP credentials in the extension configuration; do not put SMTP credentials in `app.js` or any GitHub Pages file.

After the extension is active:

1. An Owner/Admin selects a role and clicks **Add user**.
2. SCM creates the access invitation.
3. SCM queues a branded email in `mail`.
4. The Firebase extension sends it.
5. The recipient opens the SCM link and signs in or creates an account with the invited email.
6. Existing invitation-claim logic joins that account to the existing company.

The frontend remains hosted on GitHub Pages. Firebase continues to provide Authentication, Firestore, security rules, and the server-side email extension only.
