CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES public.hosts(id) ON DELETE RESTRICT,
  package_id TEXT NOT NULL,
  amount_fils INTEGER NOT NULL CHECK (amount_fils > 0),
  currency TEXT NOT NULL DEFAULT 'KWD' CHECK (currency = 'KWD'),
  minutes INTEGER NOT NULL CHECK (minutes > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'cancelled')),
  myfatoorah_invoice_id TEXT UNIQUE,
  myfatoorah_payment_id TEXT UNIQUE,
  payment_method TEXT,
  failure_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS payments_host_created_idx
  ON public.payments (host_id, created_at DESC);
