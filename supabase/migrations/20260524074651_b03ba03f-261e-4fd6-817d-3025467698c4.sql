
REVOKE EXECUTE ON FUNCTION public.has_partner_access(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_partner_access(UUID, UUID) TO authenticated;
