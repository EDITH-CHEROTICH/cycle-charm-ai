
-- Partner links table
CREATE TABLE public.partner_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  partner_id UUID,
  invite_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_partner_links_owner ON public.partner_links(owner_id);
CREATE INDEX idx_partner_links_partner ON public.partner_links(partner_id);
CREATE INDEX idx_partner_links_code ON public.partner_links(invite_code);

ALTER TABLE public.partner_links ENABLE ROW LEVEL SECURITY;

-- Owner can manage their own invites
CREATE POLICY "Owner can view own partner links"
ON public.partner_links FOR SELECT
USING (auth.uid() = owner_id);

CREATE POLICY "Owner can create partner links"
ON public.partner_links FOR INSERT
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owner can update own partner links"
ON public.partner_links FOR UPDATE
USING (auth.uid() = owner_id);

CREATE POLICY "Owner can delete own partner links"
ON public.partner_links FOR DELETE
USING (auth.uid() = owner_id);

-- Partner can see/accept links assigned to them
CREATE POLICY "Partner can view their links"
ON public.partner_links FOR SELECT
USING (auth.uid() = partner_id);

-- Partner can claim a pending invite (sets partner_id to themselves)
CREATE POLICY "Partner can accept pending invite"
ON public.partner_links FOR UPDATE
USING (status = 'pending' AND partner_id IS NULL)
WITH CHECK (auth.uid() = partner_id AND status = 'active');

-- Helper function: is viewer an active partner of owner?
CREATE OR REPLACE FUNCTION public.has_partner_access(_owner UUID, _viewer UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.partner_links
    WHERE owner_id = _owner
      AND partner_id = _viewer
      AND status = 'active'
  );
$$;

-- Allow active partners to read owner's cycle_data
CREATE POLICY "Partner can view owner cycle data"
ON public.cycle_data FOR SELECT
USING (public.has_partner_access(user_id, auth.uid()));

-- Allow active partners to read owner's period_logs
CREATE POLICY "Partner can view owner period logs"
ON public.period_logs FOR SELECT
USING (public.has_partner_access(user_id, auth.uid()));

-- Allow active partners to read owner's profile (display name)
CREATE POLICY "Partner can view owner profile"
ON public.profiles FOR SELECT
USING (public.has_partner_access(id, auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_partner_links_updated_at
BEFORE UPDATE ON public.partner_links
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
