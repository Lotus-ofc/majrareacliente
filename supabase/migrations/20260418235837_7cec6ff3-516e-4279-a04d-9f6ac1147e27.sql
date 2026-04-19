-- Enums
CREATE TYPE public.post_status AS ENUM ('pending', 'approved', 'published');
CREATE TYPE public.invoice_status AS ENUM ('pending', 'paid', 'overdue');

-- Editorial Posts
CREATE TABLE public.editorial_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  scheduled_date DATE NOT NULL,
  image_url TEXT,
  caption TEXT NOT NULL DEFAULT '',
  status public.post_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_editorial_posts_client ON public.editorial_posts(client_id, scheduled_date DESC);

ALTER TABLE public.editorial_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage posts"
  ON public.editorial_posts FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Clients read own posts"
  ON public.editorial_posts FOR SELECT
  TO authenticated
  USING (auth.uid() = client_id);

-- Clients can approve their own pending posts (only set status to 'approved')
CREATE POLICY "Clients approve own pending posts"
  ON public.editorial_posts FOR UPDATE
  TO authenticated
  USING (auth.uid() = client_id AND status = 'pending')
  WITH CHECK (auth.uid() = client_id AND status = 'approved');

CREATE TRIGGER trg_editorial_posts_updated_at
  BEFORE UPDATE ON public.editorial_posts
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Invoices
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  reference_month TEXT NOT NULL, -- e.g. "2026-04"
  amount_cents INTEGER NOT NULL DEFAULT 0,
  due_date DATE NOT NULL,
  status public.invoice_status NOT NULL DEFAULT 'pending',
  pix_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_invoices_client ON public.invoices(client_id, due_date DESC);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage invoices"
  ON public.invoices FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Clients read own invoices"
  ON public.invoices FOR SELECT
  TO authenticated
  USING (auth.uid() = client_id);

CREATE TRIGGER trg_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();