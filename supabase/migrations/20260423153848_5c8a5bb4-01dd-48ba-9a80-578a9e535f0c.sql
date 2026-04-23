-- Editorial notes: free-form agenda/notebook entries per day per client.
-- Distinct from editorial_posts (which drives the post-approval workflow).
CREATE TABLE IF NOT EXISTS public.editorial_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  note_date date NOT NULL,
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  color text NOT NULL DEFAULT 'lilac',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS editorial_notes_client_date_idx
  ON public.editorial_notes (client_id, note_date);

ALTER TABLE public.editorial_notes ENABLE ROW LEVEL SECURITY;

-- Admins manage everything
DROP POLICY IF EXISTS "Admins manage editorial notes" ON public.editorial_notes;
CREATE POLICY "Admins manage editorial notes"
ON public.editorial_notes
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Clients read only their own notes
DROP POLICY IF EXISTS "Clients read own editorial notes" ON public.editorial_notes;
CREATE POLICY "Clients read own editorial notes"
ON public.editorial_notes
FOR SELECT
TO authenticated
USING (auth.uid() = client_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_editorial_notes_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_editorial_notes_updated_at ON public.editorial_notes;
CREATE TRIGGER trg_editorial_notes_updated_at
BEFORE UPDATE ON public.editorial_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_editorial_notes_updated_at();
