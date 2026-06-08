-- Trigger-only functions: never meant to be called directly via the API.
-- Revoke EXECUTE from public/anon/authenticated.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_editorial_notes_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_client_post_update() FROM PUBLIC, anon, authenticated;

-- RLS helper functions are evaluated under the querying role during policy
-- checks, so authenticated must retain EXECUTE. Remove anon (no anon access).
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_agency_id(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_agency_member(uuid, uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_agency_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_agency_member(uuid, uuid) TO authenticated;