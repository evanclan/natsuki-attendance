-- Add student categories
INSERT INTO categories (name, for_role, sort_order)
SELECT 'Academy', 'student', 1
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Academy' AND for_role = 'student');

INSERT INTO categories (name, for_role, sort_order)
SELECT 'Ex', 'student', 2
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Ex' AND for_role = 'student');

INSERT INTO categories (name, for_role, sort_order)
SELECT 'C-Lab', 'student', 3
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'C-Lab' AND for_role = 'student');

INSERT INTO categories (name, for_role, sort_order)
SELECT 'Satursaurus', 'student', 4
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Satursaurus' AND for_role = 'student');
