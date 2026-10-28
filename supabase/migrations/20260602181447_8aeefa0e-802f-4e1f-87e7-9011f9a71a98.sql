
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_staff(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_current_user_roles() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_current_user_roles() TO authenticated;
ALTER FUNCTION public.touch_updated_at() SET search_path = public;
