-- Fix: Driver Creation Form Lacks Server-Side Validation
-- Add CHECK constraints to enforce data integrity at database level

-- Add constraints to drivers table
ALTER TABLE public.drivers
  ADD CONSTRAINT drivers_name_length CHECK (length(trim(name)) >= 2 AND length(name) <= 100),
  ADD CONSTRAINT drivers_phone_format CHECK (phone ~ '^\+?[0-9]{10,15}$');

-- Add constraints to carriers table (same validation needed)
ALTER TABLE public.carriers
  ADD CONSTRAINT carriers_name_length CHECK (length(trim(name)) >= 2 AND length(name) <= 100),
  ADD CONSTRAINT carriers_phone_format CHECK (phone IS NULL OR phone ~ '^\+?[0-9]{10,15}$');

-- Create validation trigger for additional enforcement
CREATE OR REPLACE FUNCTION public.validate_driver_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Trim whitespace and remove formatting characters
  NEW.name := trim(NEW.name);
  NEW.phone := regexp_replace(trim(NEW.phone), '[^0-9+]', '', 'g');
  
  -- Validate name length
  IF length(NEW.name) < 2 OR length(NEW.name) > 100 THEN
    RAISE EXCEPTION 'Nome deve ter entre 2 e 100 caracteres';
  END IF;
  
  -- Validate phone format
  IF NOT (NEW.phone ~ '^\+?[0-9]{10,15}$') THEN
    RAISE EXCEPTION 'Telefone deve conter entre 10 e 15 dígitos';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create validation trigger for carriers
CREATE OR REPLACE FUNCTION public.validate_carrier_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Trim whitespace and remove formatting characters
  NEW.name := trim(NEW.name);
  IF NEW.phone IS NOT NULL THEN
    NEW.phone := regexp_replace(trim(NEW.phone), '[^0-9+]', '', 'g');
  END IF;
  
  -- Validate name length
  IF length(NEW.name) < 2 OR length(NEW.name) > 100 THEN
    RAISE EXCEPTION 'Nome deve ter entre 2 e 100 caracteres';
  END IF;
  
  -- Validate phone format if provided
  IF NEW.phone IS NOT NULL AND NOT (NEW.phone ~ '^\+?[0-9]{10,15}$') THEN
    RAISE EXCEPTION 'Telefone deve conter entre 10 e 15 dígitos';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Attach triggers
CREATE TRIGGER validate_driver_before_insert_update
  BEFORE INSERT OR UPDATE ON public.drivers
  FOR EACH ROW EXECUTE FUNCTION public.validate_driver_data();

CREATE TRIGGER validate_carrier_before_insert_update
  BEFORE INSERT OR UPDATE ON public.carriers
  FOR EACH ROW EXECUTE FUNCTION public.validate_carrier_data();

-- Add comment for documentation
COMMENT ON FUNCTION public.validate_driver_data() IS 'Validates driver name and phone format before insert/update. Automatically strips phone formatting characters.';
COMMENT ON FUNCTION public.validate_carrier_data() IS 'Validates carrier name and phone format before insert/update. Automatically strips phone formatting characters.';