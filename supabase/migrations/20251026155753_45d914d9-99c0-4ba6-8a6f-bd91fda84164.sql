-- Adicionar coluna scanned_at na tabela driver_assignments
ALTER TABLE driver_assignments 
ADD COLUMN scanned_at timestamptz;

-- Criar índice para queries por scanned_at
CREATE INDEX idx_driver_assignments_scanned_at ON driver_assignments(scanned_at DESC);

-- Criar tabela opcional de logs de scan (histórico de múltiplas bipagens)
CREATE TABLE IF NOT EXISTS scan_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES drivers(id),
  shipment_id text NOT NULL,
  scanned_code text NOT NULL,
  scanned_at timestamptz NOT NULL DEFAULT now(),
  resolved_from text, -- 'qr', 'code128', 'manual', 'tracking'
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS para scan_logs
ALTER TABLE scan_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ops e admins podem ver scan logs"
  ON scan_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'ops'));

CREATE POLICY "Ops e admins podem inserir scan logs"
  ON scan_logs FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'ops'));

-- Índice para consultas rápidas
CREATE INDEX idx_scan_logs_driver ON scan_logs(driver_id, scanned_at DESC);
CREATE INDEX idx_scan_logs_shipment ON scan_logs(shipment_id);