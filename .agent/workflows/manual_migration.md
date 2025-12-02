---
description: How to manually run database migrations
---

To manually apply database migrations to the Supabase instance, run the following command in your terminal:

```bash
npx supabase db push
```

This command will:
1.  Connect to the remote Supabase database.
2.  Compare the local migration files in `supabase/migrations` with the migration history in the database.
3.  Ask for confirmation to apply pending migrations.
4.  Execute the SQL scripts for any new migrations.

**Note:** If you encounter errors about types or tables already existing, it usually means the migration script isn't idempotent. The scripts have been updated to handle this, so you should be able to safely retry.
