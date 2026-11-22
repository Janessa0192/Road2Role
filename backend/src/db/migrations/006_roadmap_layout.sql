-- Stores the converted interactive diagram (nodes/edges/topics) per roadmap.
ALTER TABLE roadmaps ADD COLUMN layout_json TEXT;
