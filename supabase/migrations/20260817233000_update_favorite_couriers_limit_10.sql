-- Update trigger function to limit favorite couriers to 10 per user (matching requirement)
CREATE OR REPLACE FUNCTION check_favorite_couriers_limit()
RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT count(*) FROM public.favorite_couriers WHERE user_id = NEW.user_id) >= 10 THEN
        RAISE EXCEPTION 'Maximum limit of 10 favorite couriers reached';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_favorite_couriers_limit ON public.favorite_couriers;
CREATE TRIGGER trg_favorite_couriers_limit
BEFORE INSERT ON public.favorite_couriers
FOR EACH ROW
EXECUTE FUNCTION check_favorite_couriers_limit();
