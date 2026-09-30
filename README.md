# Digital Vault — working starter

## Run locally
1. Install Node.js 18+.
2. Open this folder in a terminal.
3. Run `npm install`
4. Run `npm start`
5. Open http://localhost:3000
6. Admin: http://localhost:3000/admin.html

Default admin credentials:
- Username: `admin`
- Password: `change-me-now`

## Important before real sales
This starter includes product uploads, an admin panel, order records, and protected downloads after an order is marked paid.

For production you should:
- set `ADMIN_USER`, `ADMIN_PASS`, and `SESSION_SECRET` environment variables;
- connect a real payment gateway and verify webhooks server-side;
- move product files to private object storage rather than serving uploads directly;
- use a real database instead of JSON;
- add email delivery and customer order lookup;
- deploy behind HTTPS.

The current "Mark paid" button is intentionally an admin/testing mechanism; it is NOT a real payment verification system.
