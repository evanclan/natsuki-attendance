-- Create person_categories table for many-to-many relationship
CREATE TABLE IF NOT EXISTS person_categories (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    person_id uuid REFERENCES people(id) ON DELETE CASCADE NOT NULL,
    category_id uuid REFERENCES categories(id) ON DELETE CASCADE NOT NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE(person_id, category_id)
);

-- Enable RLS
ALTER TABLE person_categories ENABLE ROW LEVEL SECURITY;

-- Create policies (assuming admin access for now, similar to other tables)
CREATE POLICY "Enable read for authenticated users" ON person_categories
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable insert for authenticated users" ON person_categories
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON person_categories
    FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Enable delete for authenticated users" ON person_categories
    FOR DELETE
    TO authenticated
    USING (true);

-- Migrate existing data: Populate person_categories from people.category_id
INSERT INTO person_categories (person_id, category_id)
SELECT id, category_id
FROM people
WHERE category_id IS NOT NULL
ON CONFLICT (person_id, category_id) DO NOTHING;
