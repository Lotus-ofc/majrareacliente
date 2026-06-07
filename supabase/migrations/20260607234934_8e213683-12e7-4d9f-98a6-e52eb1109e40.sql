-- 1) Guard client updates on editorial_posts to allowed columns only
CREATE OR REPLACE FUNCTION public.guard_client_post_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Global admins and agency staff for this agency may change anything
  IF has_role(auth.uid(), 'admin')
     OR (OLD.agency_id = get_user_agency_id(auth.uid()) AND has_role(auth.uid(), 'agency_admin'))
  THEN
    RETURN NEW;
  END IF;

  -- Otherwise (clients): only allow approval/caption-change/revision fields to change
  IF NEW.id            IS DISTINCT FROM OLD.id
     OR NEW.client_id        IS DISTINCT FROM OLD.client_id
     OR NEW.agency_id        IS DISTINCT FROM OLD.agency_id
     OR NEW.scheduled_date   IS DISTINCT FROM OLD.scheduled_date
     OR NEW.scheduled_time   IS DISTINCT FROM OLD.scheduled_time
     OR NEW.image_url        IS DISTINCT FROM OLD.image_url
     OR NEW.media_urls       IS DISTINCT FROM OLD.media_urls
     OR NEW.caption          IS DISTINCT FROM OLD.caption
     OR NEW.title            IS DISTINCT FROM OLD.title
     OR NEW.post_format      IS DISTINCT FROM OLD.post_format
     OR NEW.created_at       IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'Clients may not modify restricted fields on posts';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_client_post_update ON public.editorial_posts;
CREATE TRIGGER guard_client_post_update
BEFORE UPDATE ON public.editorial_posts
FOR EACH ROW EXECUTE FUNCTION public.guard_client_post_update();

-- 2) Explicit restrictive policies so only admins can write user_roles
CREATE POLICY "Restrict role inserts to admins"
ON public.user_roles AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Restrict role updates to admins"
ON public.user_roles AS RESTRICTIVE FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Restrict role deletes to admins"
ON public.user_roles AS RESTRICTIVE FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- 3) Realtime authorization: users can only receive events on their own notif topic
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users access own notif realtime topic" ON realtime.messages;
CREATE POLICY "Users access own notif realtime topic"
ON realtime.messages FOR SELECT TO authenticated
USING ( realtime.topic() = 'notif-' || (auth.uid())::text );