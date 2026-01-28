ALTER TABLE jobs
ADD COLUMN repair_type ENUM('mechanical', 'electrical', 'ac_repair') NULL,
ADD COLUMN repair_subtype ENUM('normal_electrical', 'hybrid_system', 'ev_system') NULL;
