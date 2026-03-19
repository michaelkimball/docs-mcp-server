-- Migration: Update vector dimension from 1536 to 768 for nomic-embed-text
--
-- This migration recreates the documents_vec table with 768 dimensions.
-- nomic-embed-text produces 768-dimensional vectors which are 5-10x faster
-- to generate and provide equal or better quality for documentation search.
--
-- WARNING: All existing embeddings will be LOST and must be regenerated.

-- Drop the old virtual table with 1536 dimensions
DROP TABLE IF EXISTS documents_vec;

-- Create new virtual table with 768 dimensions for nomic-embed-text
CREATE VIRTUAL TABLE documents_vec USING vec0(
  library_id INTEGER NOT NULL,
  version_id INTEGER NOT NULL,
  embedding FLOAT[768]
);

-- Note: Vectors will be regenerated automatically when documents are re-indexed
-- with the new nomic-embed-text model.
