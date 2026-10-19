-- Test fixture only: PostgreSQL must roll back the DDL and abort startup.
CREATE TABLE ta7ady.failure_probe (id integer PRIMARY KEY);
SELECT 1 / 0;
