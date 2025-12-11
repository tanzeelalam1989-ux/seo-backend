CREATE TABLE IF NOT EXISTS domains (
    id SERIAL PRIMARY KEY,
    domain VARCHAR(255) UNIQUE NOT NULL,
    opr_score NUMERIC(4,2),
    authority_score INTEGER,
    traffic_bucket VARCHAR(20),
    keywords_bucket VARCHAR(50),
    value_bucket VARCHAR(20),
    last_fetched_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_updated_at
BEFORE UPDATE ON domains
FOR EACH ROW
EXECUTE PROCEDURE set_updated_at();
