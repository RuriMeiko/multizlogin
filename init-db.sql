-- init-db.sql - Initialize PostgreSQL database schema

-- Table: zalo_credentials
-- Stores Zalo account credentials (cookies)
CREATE TABLE IF NOT EXISTS zalo_credentials (
    id SERIAL PRIMARY KEY,
    own_id VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(50),
    display_name VARCHAR(255),
    credentials JSONB NOT NULL,
    proxy VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_zalo_credentials_own_id ON zalo_credentials(own_id);
CREATE INDEX IF NOT EXISTS idx_zalo_credentials_phone ON zalo_credentials(phone_number);

-- Table: proxies
-- Stores proxy configurations
CREATE TABLE IF NOT EXISTS proxies (
    id SERIAL PRIMARY KEY,
    url VARCHAR(500) UNIQUE NOT NULL,
    max_accounts INTEGER DEFAULT 3,
    current_accounts INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for active proxies
CREATE INDEX IF NOT EXISTS idx_proxies_active ON proxies(is_active);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_zalo_credentials_updated_at 
    BEFORE UPDATE ON zalo_credentials
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default proxy if needed
-- INSERT INTO proxies (url, max_accounts) VALUES ('http://default-proxy:8080', 3) ON CONFLICT DO NOTHING;

COMMENT ON TABLE zalo_credentials IS 'Stores Zalo account login credentials and metadata';
COMMENT ON TABLE proxies IS 'Stores proxy server configurations';
