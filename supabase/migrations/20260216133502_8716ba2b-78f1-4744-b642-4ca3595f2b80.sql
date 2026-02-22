
-- Add optional nota_fiscal column to contas_pagar and contas_receber
ALTER TABLE public.contas_pagar ADD COLUMN nota_fiscal text;
ALTER TABLE public.contas_receber ADD COLUMN nota_fiscal text;
