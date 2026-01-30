-- Add flow intensity and notes to period_logs
ALTER TABLE public.period_logs 
ADD COLUMN IF NOT EXISTS flow_intensity TEXT DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create daily_logs table for mood, symptoms, and notes per day
CREATE TABLE IF NOT EXISTS public.daily_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  log_date DATE NOT NULL,
  mood TEXT,
  energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 5),
  sleep_quality INTEGER CHECK (sleep_quality >= 1 AND sleep_quality <= 5),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, log_date)
);

-- Enable RLS on daily_logs
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for daily_logs
CREATE POLICY "Users can view own daily logs" ON public.daily_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily logs" ON public.daily_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily logs" ON public.daily_logs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own daily logs" ON public.daily_logs
  FOR DELETE USING (auth.uid() = user_id);

-- Add date column to symptoms table for tracking symptoms on specific dates
ALTER TABLE public.symptoms 
ADD COLUMN IF NOT EXISTS log_date DATE DEFAULT CURRENT_DATE;

-- Update trigger for daily_logs
CREATE TRIGGER update_daily_logs_updated_at
  BEFORE UPDATE ON public.daily_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();