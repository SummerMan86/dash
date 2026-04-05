-- Seed: initial admin user for EMIS auth
-- Password: admin (bcrypt cost 12)
-- This seed is idempotent: skips if username 'admin' already exists

INSERT INTO emis.users (username, password_hash, role)
VALUES (
    'admin',
    '$2b$12$dXpqkndM//yqYFGEv5BzweRkUpHewVH2xlo2nmTYJRZ7g3nUBgO0W',
    'admin'
)
ON CONFLICT (username) DO NOTHING;
