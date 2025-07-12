-- Execute este SQL no Supabase Dashboard > SQL Editor
-- Para aplicar a migração da coluna contributions

-- Add contributions column to goals table as JSON array
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS contributions JSONB DEFAULT '[]'::jsonb;

-- Add index for better performance on contributions queries
CREATE INDEX IF NOT EXISTS idx_goals_contributions ON public.goals USING gin(contributions);

-- Add comment to explain the structure
COMMENT ON COLUMN public.goals.contributions IS 'JSON array of contributions: [{"id": "uuid", "amount": 100.50, "notes": "description", "created_at": "timestamp"}]';