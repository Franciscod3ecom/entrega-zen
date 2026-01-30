-- Corrigir função sem search_path definido
CREATE OR REPLACE FUNCTION public.slim_shipment_raw_data(data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
BEGIN
  -- Remover campos pesados, manter apenas essenciais
  RETURN jsonb_build_object(
    'id', data->'id',
    'status', data->'status',
    'substatus', data->'substatus',
    'logistic', jsonb_build_object(
      'type', data->'logistic'->'type',
      'mode', data->'logistic'->'mode'
    ),
    'buyer_info', data->'buyer_info',
    'tracking_number', data->'tracking_number'
  );
END;
$$;