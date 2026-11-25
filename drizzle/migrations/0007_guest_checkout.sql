ALTER TABLE public.orders ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.entries ALTER COLUMN user_id DROP NOT NULL;

DROP POLICY IF EXISTS "Users read own orders" ON public.orders;
CREATE POLICY "Users read own orders" ON public.orders FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

GRANT SELECT ON public.orders TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.enforce_entry_limits()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  c public.campaigns%rowtype;
  total_valid integer;
  user_valid integer;
BEGIN
  SELECT * INTO c FROM public.campaigns WHERE id = new.campaign_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Campaign not found'; END IF;
  IF c.mode <> 'production' THEN RAISE EXCEPTION 'Entries cannot be created while the campaign is in demo mode'; END IF;
  IF c.ends_at IS NOT NULL AND now() > c.ends_at THEN RAISE EXCEPTION 'Campaign has ended'; END IF;
  IF new.user_id IS NOT NULL THEN
    SELECT count(*) INTO user_valid FROM public.entries WHERE campaign_id = new.campaign_id AND user_id = new.user_id AND status = 'valid';
    IF user_valid >= c.max_per_user THEN RAISE EXCEPTION 'Personal entry limit reached'; END IF;
  END IF;
  SELECT count(*) INTO total_valid FROM public.entries WHERE campaign_id = new.campaign_id AND status = 'valid';
  IF total_valid >= c.max_inventory THEN RAISE EXCEPTION 'Campaign inventory is sold out'; END IF;
  SELECT coalesce(max(entry_number), 0) + 1 INTO new.entry_number FROM public.entries WHERE campaign_id = new.campaign_id;
  new.status := 'valid';
  RETURN new;
END;
$$;

CREATE OR REPLACE FUNCTION public.allocate_entries(_campaign_id uuid, _user_id uuid, _quantity integer)
RETURNS SETOF public.entries LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  c public.campaigns%rowtype;
  total_valid integer;
  user_valid integer;
  i integer;
BEGIN
  IF _quantity IS NULL OR _quantity < 1 THEN RAISE EXCEPTION 'Invalid quantity'; END IF;
  SELECT * INTO c FROM public.campaigns WHERE id = _campaign_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Campaign not found'; END IF;
  IF c.mode <> 'production' THEN RAISE EXCEPTION 'Entries cannot be created while the campaign is in demo mode'; END IF;
  SELECT count(*) INTO total_valid FROM public.entries WHERE campaign_id = _campaign_id AND status = 'valid';
  IF _user_id IS NOT NULL THEN
    SELECT count(*) INTO user_valid FROM public.entries WHERE campaign_id = _campaign_id AND user_id = _user_id AND status = 'valid';
    IF user_valid + _quantity > c.max_per_user THEN RAISE EXCEPTION 'Personal entry limit exceeded'; END IF;
  END IF;
  IF total_valid + _quantity > c.max_inventory THEN RAISE EXCEPTION 'Not enough campaign inventory'; END IF;
  FOR i IN 1.._quantity LOOP
    RETURN QUERY INSERT INTO public.entries (campaign_id, user_id, entry_number) VALUES (_campaign_id, _user_id, 0) RETURNING *;
  END LOOP;
END;
$$;
GRANT EXECUTE ON FUNCTION public.allocate_entries(uuid, uuid, integer) TO service_role;

CREATE OR REPLACE FUNCTION public.get_public_entries(_campaign_id uuid, _limit integer DEFAULT 50, _offset integer DEFAULT 0)
RETURNS TABLE (entry_number integer, public_handle text, status text, created_at timestamptz, order_code text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT e.entry_number,
    coalesce(
      p.public_handle,
      CASE
        WHEN o.payer_name IS NOT NULL AND length(trim(o.payer_name)) > 0 THEN trim(o.payer_name)
        WHEN o.payer_email IS NOT NULL AND length(trim(o.payer_email)) > 0 THEN split_part(trim(o.payer_email), '@', 1)
        ELSE 'RSP-GUEST'
      END
    ) AS public_handle,
    e.status,
    e.created_at,
    o.order_code
  FROM public.entries e
  JOIN public.campaigns c ON c.id = e.campaign_id AND c.mode = 'production'
  LEFT JOIN public.profiles p ON p.id = e.user_id
  LEFT JOIN public.orders o ON o.id = e.order_id
  WHERE e.campaign_id = _campaign_id AND e.status = 'valid'
  ORDER BY e.entry_number DESC
  LIMIT least(greatest(_limit, 1), 200) OFFSET greatest(_offset, 0);
$$;
GRANT EXECUTE ON FUNCTION public.get_public_entries(uuid, integer, integer) TO anon, authenticated, service_role;