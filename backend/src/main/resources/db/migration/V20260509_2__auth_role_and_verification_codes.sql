ALTER TABLE users
    ADD COLUMN IF NOT EXISTS role VARCHAR(32) NOT NULL DEFAULT 'USER';

UPDATE users
SET role = 'ORGANIZER'
WHERE id IN (
    SELECT DISTINCT CAST(owner_user_id AS BIGINT)
    FROM issued_tickets
    WHERE owner_user_id ~ '^[0-9]+$'
);

CREATE TABLE IF NOT EXISTS auth_verification_codes (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    purpose VARCHAR(32) NOT NULL,
    code_hash VARCHAR(255) NOT NULL,
    verification_key VARCHAR(255),
    expires_at TIMESTAMP NOT NULL,
    verified_at TIMESTAMP NULL,
    consumed_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_auth_verification_codes_lookup
    ON auth_verification_codes (email, purpose, consumed_at, id DESC);
