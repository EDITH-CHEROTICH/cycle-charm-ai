-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  age INTEGER,
  contraception_use TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create cycle data table
CREATE TABLE public.cycle_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_period_date DATE NOT NULL,
  average_cycle_length INTEGER DEFAULT 28,
  average_period_length INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Create symptoms table
CREATE TABLE public.symptoms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symptom_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create period logs table
CREATE TABLE public.period_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cycle_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.symptoms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.period_logs ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Cycle data policies
CREATE POLICY "Users can view own cycle data"
  ON public.cycle_data FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cycle data"
  ON public.cycle_data FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cycle data"
  ON public.cycle_data FOR UPDATE
  USING (auth.uid() = user_id);

-- Symptoms policies
CREATE POLICY "Users can view own symptoms"
  ON public.symptoms FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own symptoms"
  ON public.symptoms FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own symptoms"
  ON public.symptoms FOR DELETE
  USING (auth.uid() = user_id);

-- Period logs policies
CREATE POLICY "Users can view own period logs"
  ON public.period_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own period logs"
  ON public.period_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own period logs"
  ON public.period_logs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own period logs"
  ON public.period_logs FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cycle_data_updated_at
  BEFORE UPDATE ON public.cycle_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();