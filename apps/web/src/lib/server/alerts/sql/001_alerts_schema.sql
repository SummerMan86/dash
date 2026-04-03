-- ============================================================================
-- Alerts Schema for Dashboard Builder
-- Run this migration against your PostgreSQL database
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS alerts;

-- ----------------------------------------------------------------------------
-- Alert Rules: conditions that trigger notifications
-- ----------------------------------------------------------------------------
CREATE TABLE alerts.rules (
    id              BIGSERIAL PRIMARY KEY,
    seller_id       BIGINT NOT NULL,
    name            TEXT NOT NULL,
    description     TEXT,

    -- Condition definition (JSONB for flexibility)
    -- Example: {"metric": "stock_count", "operator": "<=", "threshold": 0}
    condition       JSONB NOT NULL,

    -- Which data source to check
    dataset_id      TEXT NOT NULL,  -- e.g., 'wildberries.fact_product_period'

    -- Schedule (cron expression)
    schedule_cron   TEXT NOT NULL DEFAULT '0 9 * * *',  -- daily at 9:00

    -- State
    enabled         BOOLEAN NOT NULL DEFAULT TRUE,
    last_checked_at TIMESTAMPTZ,
    last_triggered_at TIMESTAMPTZ,

    -- Metadata
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_rule_name_seller UNIQUE (seller_id, name)
);

CREATE INDEX ix_alerts_rules_enabled ON alerts.rules (enabled) WHERE enabled = TRUE;
CREATE INDEX ix_alerts_rules_seller ON alerts.rules (seller_id);

-- ----------------------------------------------------------------------------
-- Recipients: who receives notifications
-- ----------------------------------------------------------------------------
CREATE TABLE alerts.recipients (
    id              BIGSERIAL PRIMARY KEY,
    seller_id       BIGINT NOT NULL,

    -- Channel type and address
    channel         TEXT NOT NULL CHECK (channel IN ('telegram', 'browser_push', 'email')),
    address         TEXT NOT NULL,  -- telegram chat_id, push subscription, email

    -- Display name
    name            TEXT,

    -- State
    enabled         BOOLEAN NOT NULL DEFAULT TRUE,
    verified_at     TIMESTAMPTZ,    -- when address was verified

    -- Metadata
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_recipient_channel_address UNIQUE (seller_id, channel, address)
);

CREATE INDEX ix_alerts_recipients_seller ON alerts.recipients (seller_id);

-- ----------------------------------------------------------------------------
-- Rule-Recipient mapping (many-to-many)
-- ----------------------------------------------------------------------------
CREATE TABLE alerts.rule_recipients (
    rule_id         BIGINT NOT NULL REFERENCES alerts.rules(id) ON DELETE CASCADE,
    recipient_id    BIGINT NOT NULL REFERENCES alerts.recipients(id) ON DELETE CASCADE,

    PRIMARY KEY (rule_id, recipient_id)
);

-- ----------------------------------------------------------------------------
-- Alert History: log of sent notifications
-- ----------------------------------------------------------------------------
CREATE TABLE alerts.history (
    id              BIGSERIAL PRIMARY KEY,
    rule_id         BIGINT NOT NULL REFERENCES alerts.rules(id) ON DELETE CASCADE,
    recipient_id    BIGINT REFERENCES alerts.recipients(id) ON DELETE SET NULL,

    -- Trigger details
    triggered_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    condition_snapshot JSONB NOT NULL,  -- condition at trigger time
    matched_data    JSONB,              -- sample of rows that matched
    matched_count   INT NOT NULL DEFAULT 0,

    -- Delivery status
    channel         TEXT NOT NULL,
    status          TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed', 'throttled')),
    sent_at         TIMESTAMPTZ,
    error_message   TEXT,

    -- Deduplication (prevent spam for same condition on same day)
    dedup_key       TEXT
);

CREATE INDEX ix_alerts_history_rule ON alerts.history (rule_id, triggered_at DESC);
CREATE INDEX ix_alerts_history_status ON alerts.history (status) WHERE status IN ('pending', 'failed');
CREATE UNIQUE INDEX ix_alerts_history_dedup ON alerts.history (rule_id, dedup_key, DATE(triggered_at))
    WHERE dedup_key IS NOT NULL;

-- ----------------------------------------------------------------------------
-- Scheduler Lock (for distributed locking across instances)
-- ----------------------------------------------------------------------------
CREATE TABLE alerts.scheduler_locks (
    lock_name       TEXT PRIMARY KEY,
    locked_by       TEXT NOT NULL,      -- instance identifier
    locked_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ NOT NULL
);

-- ----------------------------------------------------------------------------
-- Helper function to update updated_at timestamp
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION alerts.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_rules_updated_at
    BEFORE UPDATE ON alerts.rules
    FOR EACH ROW
    EXECUTE FUNCTION alerts.update_updated_at();
