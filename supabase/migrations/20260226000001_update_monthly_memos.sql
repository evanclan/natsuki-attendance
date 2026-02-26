-- Drop the unique constraint to allow multiple memos per person per month
ALTER TABLE monthly_memos DROP CONSTRAINT IF EXISTS monthly_memos_person_id_month_year_key;
