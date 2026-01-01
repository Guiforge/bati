-- Add hasNewRecords column to completed_sessions to track if session achieved PRs
ALTER TABLE completed_sessions
ADD COLUMN hasNewRecords INTEGER NOT NULL DEFAULT 0;