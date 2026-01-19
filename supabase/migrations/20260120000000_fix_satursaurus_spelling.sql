-- Update existing category name from Satasaurus to Satursaurus
-- This migration updates the category name in the database to fix the spelling

UPDATE categories
SET name = 'Satursaurus'
WHERE name = 'Satasaurus' AND for_role = 'student';

-- Also update any variant like "Satasaurus Class" that might exist
UPDATE categories
SET name = 'Satursaurus Class'
WHERE name = 'Satasaurus Class' AND for_role = 'student';
