-- LexiLens SQL Database Schema (PostgreSQL & SQLite compatible)

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  password_hash TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT UNIQUE NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  doc_type TEXT NOT NULL DEFAULT 'unknown',
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  file_path TEXT,
  page_count INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending',
  processing_error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS document_versions (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS document_pages (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  page_number INTEGER NOT NULL,
  content TEXT NOT NULL,
  token_count INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS document_chunks (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  page_number INTEGER NOT NULL,
  section_heading TEXT,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  token_count INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS embeddings (
  id TEXT PRIMARY KEY,
  chunk_id TEXT NOT NULL,
  vector_json TEXT NOT NULL,
  dimension INTEGER NOT NULL DEFAULT 64,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (chunk_id) REFERENCES document_chunks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS analysis_results (
  id TEXT PRIMARY KEY,
  document_id TEXT UNIQUE NOT NULL,
  executive_summary TEXT,
  parties_json TEXT,
  effective_date TEXT,
  expiration_date TEXT,
  duration TEXT,
  renewal_info TEXT,
  termination_info TEXT,
  governing_law TEXT,
  financial_terms_json TEXT,
  key_restrictions_json TEXT,
  main_obligations_json TEXT,
  important_sections_json TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS section_explanations (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  section_title TEXT NOT NULL,
  page_number INTEGER NOT NULL,
  original_text TEXT NOT NULL,
  plain_explanation TEXT NOT NULL,
  who_is_affected TEXT,
  action_required TEXT,
  what_to_clarify TEXT,
  source_ref TEXT,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS attention_areas (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  category TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'moderate',
  title TEXT NOT NULL,
  what_it_says TEXT NOT NULL,
  why_it_matters TEXT NOT NULL,
  question_to_consider TEXT NOT NULL,
  source_page INTEGER NOT NULL DEFAULT 1,
  source_section TEXT,
  chunk_id TEXT,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS obligations (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  party TEXT NOT NULL,
  obligation TEXT NOT NULL,
  deadline TEXT,
  frequency TEXT,
  condition TEXT,
  consequence TEXT,
  source_page INTEGER NOT NULL DEFAULT 1,
  is_completed INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS checklist_items (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  category TEXT NOT NULL,
  task TEXT NOT NULL,
  source_ref TEXT,
  is_completed INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  citations_json TEXT,
  needs_review INTEGER NOT NULL DEFAULT 0,
  is_found INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS comparisons (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  doc_a_id TEXT NOT NULL,
  doc_b_id TEXT NOT NULL,
  executive_summary TEXT NOT NULL,
  total_changes INTEGER NOT NULL DEFAULT 0,
  changes_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (doc_a_id) REFERENCES documents(id) ON DELETE CASCADE,
  FOREIGN KEY (doc_b_id) REFERENCES documents(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  document_id TEXT,
  details TEXT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Query Performance Indexes
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_pages_document_id ON document_pages(document_id, page_number);
CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON document_chunks(document_id, chunk_index);
CREATE INDEX IF NOT EXISTS idx_attention_doc_id ON attention_areas(document_id);
CREATE INDEX IF NOT EXISTS idx_obligations_doc_id ON obligations(document_id);
CREATE INDEX IF NOT EXISTS idx_checklist_doc_id ON checklist_items(document_id);
CREATE INDEX IF NOT EXISTS idx_messages_conv_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_audit_user_id ON audit_events(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
