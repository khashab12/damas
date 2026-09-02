-- Orders schema (Postgres).
--
-- Applied automatically on first use by lib/orders/store.ts, and kept here so
-- it can also be run by hand or from CI:
--   psql "$DATABASE_URL" -f lib/orders/schema.sql
--
-- Money is integer halalas (1 SAR = 100 halalas) — never a float.

CREATE TABLE IF NOT EXISTS orders (
  id                   TEXT PRIMARY KEY,
  status               TEXT        NOT NULL DEFAULT 'confirmed',
  lines                JSONB       NOT NULL,
  total_halalas        INTEGER     NOT NULL CHECK (total_halalas >= 0),
  customer_name        TEXT        NOT NULL,
  customer_phone       TEXT        NOT NULL,
  fulfilment           TEXT        NOT NULL CHECK (fulfilment IN ('delivery', 'pickup')),
  address              TEXT,
  note                 TEXT,
  notification_message TEXT        NOT NULL DEFAULT '',
  created_at           TIMESTAMPTZ NOT NULL,
  updated_at           TIMESTAMPTZ NOT NULL
);

-- The kitchen reads newest-first.
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders (created_at DESC);

-- Lookup by customer phone for "where is my order".
CREATE INDEX IF NOT EXISTS orders_customer_phone_idx ON orders (customer_phone);

-- Order lifecycle status for the /admin/orders dashboard.
--
-- Additive migration: a table created by the block above already has the
-- column, so this is a no-op there. It exists for databases created before the
-- dashboard shipped. Existing rows keep their data and default to 'confirmed';
-- nothing is dropped.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'confirmed';

-- Postgres has no ADD CONSTRAINT IF NOT EXISTS, and this file re-runs.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_status_check'
  ) THEN
    ALTER TABLE orders ADD CONSTRAINT orders_status_check
      CHECK (status IN ('confirmed', 'prepared', 'delivered'));
  END IF;
END $$;
