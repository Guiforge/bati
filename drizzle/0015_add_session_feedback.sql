-- Add feedback column to completed_sessions table
-- Stores user's post-workout feedback: 'easy', 'good', or 'hard'
ALTER TABLE completed_sessions
ADD COLUMN feedback TEXT;