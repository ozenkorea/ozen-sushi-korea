# Menu management handoff

Implementation branch: owner-menu-admin. Prepared for GitHub preview deployment; production deployment is pending.

## Routes
- `/admin`: Korean owner portal; email/password authentication; add/edit menu, photo uploads, visibility, sold-out state and display order.
- `/ozen-korea/menu`: dine-in menu, retaining the original image menu until at least one published dine-in item exists.
- `/ozen-korea/takeout`: takeout catalog. No fabricated menu items or prices are included.
- Sushi continues to use the original image menu; its editable catalog is a later step.

## Connect the owner's backend
1. Create a Supabase project owned by the restaurant.
2. Run `database/menu.sql` once using its SQL Editor.
3. Create the owner's user in Authentication with a private password. Disable public signups.
4. Run the membership insert shown at the bottom of the SQL, using the created user's UUID. Only trusted SQL administrators can grant membership.
5. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to Vercel environment variables and local `.env.local`. These are public client credentials. Never supply a service-role/secret key here.
6. Deploy a preview, verify login, then test photo upload, hidden draft, publishing, price editing, ordering and sold-out state. Verify an unrelated authenticated account cannot write or read hidden items.
7. Enter the complete current dine-in menu as hidden drafts before publishing. Publishing the first item switches the dine-in catalog away from the old images. Takeout content must be checked against the final menu document.
8. Check the preview on phone and desktop before production deployment. Retain the existing domain and paths.

## Limitations and verification
- SQL/RLS and real authentication/storage need integration testing on the actual Supabase project; they cannot be tested without a project.
- Photos are public restaurant assets; drafts hide menu records, not uploaded photo URLs. Unused uploaded photos can be cleaned up in Storage later.
- Saves affect newly loaded guest pages and pages returning to the foreground; there is no live push to an already open foreground page.
- Editing uses last saved write; coordinate edits when more than one administrator is active.
- No T-order synchronization, ordering/payment, QR file generation, or new paper-menu export is included in this first implementation.
- Existing repository uses Next 13-era dependencies; framework maintenance and vulnerability review are required before a production release.

## Local verification
- Production build and TypeScript checks passed. HTTP smoke checks could not reach the local server from the separate execution context; runtime route checks remain pending.
- Browser layout verification was blocked by the container Chromium sandbox; mobile visual QA is still pending.

## Existing menu import review
`/admin/review` contains 84 dine-in records transcribed from the repository images (pages 2–8) and 76 takeout records from Library document Ozen_Korea_Takeout_Menu_Print.docx, version 4 (November 10, 2026). Records have deterministic UUIDs. All import writes are hidden drafts; existing records and owner edits are never overwritten. The owner must press the import button while signed in to persist them. The import extracts food photographs from the original menu pages in the browser and uploads them to Supabase Storage before inserting rows. Retrying reuses the same photo paths. Text source provenance and review flags are retained in data/menu-import.json.

Source differences: 36 matched item prices differ. B9, F10, F11 identify different dishes in the two sources; G7 is a bottle versus CANMAK. These four takeout items deliberately have no shared dining photograph. E13 and H1–H3 also have no image source. These are source discrepancies for owner review, not automatic corrections. Dining prices and seasonal availability require current confirmation. Options are preserved as text; selectable options are not implemented.
