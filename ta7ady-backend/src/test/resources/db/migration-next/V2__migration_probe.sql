-- Test fixture only; deliberately non-idempotent to detect accidental reapplication.
CREATE TABLE ta7ady.migration_probe (id integer PRIMARY KEY);
INSERT INTO ta7ady.migration_probe (id) VALUES (1);
