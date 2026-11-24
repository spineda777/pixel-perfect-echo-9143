CREATE OR REPLACE FUNCTION public.get_campaign_stats(_campaign_id uuid)
RETURNS TABLE(entries_sold integer, max_inventory integer, remaining integer, is_demo boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE c public.campaigns%rowtype; sold integer; allocated integer;
BEGIN
 SELECT * INTO c FROM public.campaigns WHERE id = _campaign_id;
 IF NOT FOUND THEN RETURN; END IF;
 IF c.mode = 'demo' THEN sold := c.demo_entries_sold; allocated := sold;
 ELSE
 SELECT count(*) INTO allocated FROM public.entries WHERE campaign_id = _campaign_id AND status = 'valid';
 SELECT count(*) INTO sold FROM public.entries e JOIN public.orders o ON o.id = e.order_id WHERE e.campaign_id = _campaign_id AND e.status = 'valid' AND o.status = 'completed' AND o.paypal_capture_id IS NOT NULL AND o.paypal_capture_id <> 'DEMO_SIMULATION';
 END IF;
 RETURN QUERY SELECT sold, c.max_inventory, greatest(c.max_inventory - allocated, 0), (c.mode = 'demo');
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_campaign_stats(uuid) TO anon, authenticated, service_role;