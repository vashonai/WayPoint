-- Runs once, when the Postgres volume is first created.
-- The test suite resets this database on every run; dev data lives in `waypoint`.
-- PostGIS itself is created by the migrations, so Neon and local stay identical.
CREATE DATABASE waypoint_test OWNER waypoint;
