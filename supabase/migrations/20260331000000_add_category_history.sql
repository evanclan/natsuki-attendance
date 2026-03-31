-- =============================================
-- Category History for Students
-- =============================================
-- Each "period" represents a time range when a student
-- belonged to a set of categories. A period can have
-- MULTIPLE categories (via the join table).
-- =============================================

-- Main period table
CREATE TABLE IF NOT EXISTS person_category_history (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  person_id uuid REFERENCES people(id) ON DELETE CASCADE NOT NULL,
  valid_from date NOT NULL,
  valid_until date,          -- null = "Present" (ongoing)
  note text,
  created_at timestamptz DEFAULT now()
);

-- Index for efficient querying
CREATE INDEX IF NOT EXISTS idx_person_category_history_lookup
ON person_category_history(person_id, valid_from, valid_until);

-- Join table: each period can have multiple categories
CREATE TABLE IF NOT EXISTS person_category_history_categories (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  history_id bigint REFERENCES person_category_history(id) ON DELETE CASCADE NOT NULL,
  category_id uuid REFERENCES categories(id) ON DELETE CASCADE NOT NULL,
  UNIQUE(history_id, category_id)
);

-- =============================================
-- RLS Policies
-- =============================================

ALTER TABLE person_category_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE person_category_history_categories ENABLE ROW LEVEL SECURITY;

-- person_category_history policies
CREATE POLICY "Enable read for authenticated users" ON person_category_history
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated users" ON person_category_history
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON person_category_history
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable delete for authenticated users" ON person_category_history
    FOR DELETE TO authenticated USING (true);

-- person_category_history_categories policies
CREATE POLICY "Enable read for authenticated users" ON person_category_history_categories
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated users" ON person_category_history_categories
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON person_category_history_categories
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable delete for authenticated users" ON person_category_history_categories
    FOR DELETE TO authenticated USING (true);

-- =============================================
-- Seed: Migrate existing person_categories data
-- Creates one open-ended period per student using their
-- registration_date as valid_from, with all current categories.
-- =============================================

DO $$
DECLARE
  student_rec RECORD;
  new_history_id bigint;
BEGIN
  -- Only seed if the table is empty (safe to re-run)
  IF NOT EXISTS (SELECT 1 FROM person_category_history LIMIT 1) THEN
    -- Loop through each student who has categories
    FOR student_rec IN
      SELECT DISTINCT p.id AS person_id, p.registration_date
      FROM people p
      JOIN person_categories pc ON pc.person_id = p.id
      WHERE p.role = 'student'
    LOOP
      -- Create one period per student
      INSERT INTO person_category_history (person_id, valid_from, valid_until, note)
      VALUES (
        student_rec.person_id,
        COALESCE(student_rec.registration_date, '2024-01-01'),
        NULL,
        'Initial migration from existing categories'
      )
      RETURNING id INTO new_history_id;

      -- Copy all their current categories into this period
      INSERT INTO person_category_history_categories (history_id, category_id)
      SELECT new_history_id, pc.category_id
      FROM person_categories pc
      WHERE pc.person_id = student_rec.person_id;
    END LOOP;
  END IF;
END $$;
