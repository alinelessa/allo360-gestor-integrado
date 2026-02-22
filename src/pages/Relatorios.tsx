import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

const Relatorios = () => {
  const { profile } = useAuth();
  const empresaId = profile?.empresa_id;
  const [dateFrom, setDateFrom] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() - 3); return d.toISOString().split("T")[0]; });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);

  const [fluxoCaixa, setFluxoCaixa] = useState<any[]>([]);
  const [estoqueReport, setEstoqueReport] = useState<any[]>([]);
  const [vendasReport, setVendasReport] = useState<any[]>([]);

  useEffect(() => {
    if (!empresaId) return;
    const fetch = async () => {
      const [receber, pagar, produtos, pedidos] = await Promise.all([
        supabase.from("contas_receber").select("*").eq("empresa_id", empresaId).gte("created_at", dateFrom).lte("created_at", dateTo + "T23:59:59"),
        supabase.from("contas_pagar").select("*").eq("empresa_id", empresaId).gte("created_at", dateFrom).lte("created_at", dateTo + "T23:59:59"),
        supabase.from("produtos").select("*").eq("empresa_id", empresaId).is("deleted_at", null).order("nome"),
        supabase.from("pedidos_venda").select("*").eq("empresa_id", empresaId).eq("status", "finalizado").gte("created_at", dateFrom).lte("created_at", dateTo + "T23:59:59"),
      ]);

      // Cash flow by month
      const months: Record<string, { receitas: number; despesas: number }> = {};
      (receber.data || []).forEach(r => {
        const m = r.created_at.substring(0, 7);
        if (!months[m]) months[m] = { receitas: 0, despesas: 0 };
        months[m].receitas += Number(r.valor);
      });
      (pagar.data || []).forEach(p => {
        const m = p.created_at.substring(0, 7);
        if (!months[m]) months[m] = { receitas: 0, despesas: 0 };
        months[m].despesas += Number(p.valor);
      });
      const fluxo = Object.entries(months).sort().map(([mes, v]) => ({
        mes, ...v, saldo: v.receitas - v.despesas,
      }));
      setFluxoCaixa(fluxo);

      // Stock report
      setEstoqueReport((produtos.data || []).map(p => ({
        ...p,
        valorEstoque: Number(p.custo) * p.estoque_atual,
        margemBruta: Number(p.preco) > 0 ? ((Number(p.preco) - Number(p.custo)) / Number(p.preco) * 100) : 0,
        alerta: p.estoque_atual <= p.estoque_minimo,
      })));

      // Sales report
      const pedidosData = pedidos.data || [];
      setVendasReport(pedidosData.map(p => ({
        numero: p.numero,
        total: Number(p.total),
        data: new Date(p.created_at).toLocaleDateString("pt-BR"),
        nota_fiscal: p.nota_fiscal,
      })));
    };
    fetch();
  }, [empresaId, dateFrom, dateTo]);

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const totalReceitas = fluxoCaixa.reduce((s, f) => s + f.receitas, 0);
  const totalDespesas = fluxoCaixa.reduce((s, f) => s + f.despesas, 0);
  const totalEstoque = estoqueReport.reduce((s, e) => s + e.valorEstoque, 0);
  const totalVendas = vendasReport.reduce((s, v) => s + v.total, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Relatórios</h1>
          <p className="text-muted-foreground text-sm">Relatórios gerenciais</p>
        </div>
        <div className="flex gap-3 items-end">
          <div><Label className="text-xs">De</Label><Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-40" /></div>
          <div><Label className="text-xs">Até</Label><Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-40" /></div>
        </div>
      </div>

      <Tabs defaultValue="fluxo">
        <TabsList>
          <TabsTrigger value="fluxo">Fluxo de Caixa</TabsTrigger>
          <TabsTrigger value="estoque">Estoque</TabsTrigger>
          <TabsTrigger value="vendas">Vendas</TabsTrigger>
        </TabsList>

        <TabsContent value="fluxo" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground uppercase">Total Receitas</p><p className="text-xl font-bold text-success mt-1">{fmt(totalReceitas)}</p></CardContent></Card>
            <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground uppercase">Total Despesas</p><p className="text-xl font-bold text-destructive mt-1">{fmt(totalDespesas)}</p></CardContent></Card>
            <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground uppercase">Saldo</p><p className={`text-xl font-bold mt-1 ${totalReceitas - totalDespesas >= 0 ? "text-success" : "text-destructive"}`}>{fmt(totalReceitas - totalDespesas)}</p></CardContent></Card>
          </div>
          <Card>
            <CardContent className="p-4">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={fluxoCaixa}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="receitas" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} name="Receitas" />
                  <Bar dataKey="despesas" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} name="Despesas" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={fluxoCaixa}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="saldo" stroke="hsl(var(--primary))" strokeWidth={2} name="Saldo Acumulado" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="estoque" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground uppercase">Valor Total em Estoque</p><p className="text-xl font-bold text-primary mt-1">{fmt(totalEstoque)}</p></CardContent></Card>
            <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground uppercase">Produtos em Alerta</p><p className="text-xl font-bold text-destructive mt-1">{estoqueReport.filter(e => e.alerta).length}</p></CardContent></Card>
          </div>
          <Card>
            <CardContent className="p-4">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Produto</TableHead><TableHead className="text-center">Estoque</TableHead><TableHead className="text-center">Mínimo</TableHead>
                  <TableHead className="text-right">Custo</TableHead><TableHead className="text-right">Preço</TableHead><TableHead className="text-right">Margem</TableHead>
                  <TableHead className="text-right">Valor Estoque</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {estoqueReport.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.nome} {p.alerta && <Badge variant="destructive" className="ml-2 text-xs">Baixo</Badge>}</TableCell>
                      <TableCell className="text-center">{p.estoque_atual}</TableCell>
                      <TableCell className="text-center">{p.estoque_minimo}</TableCell>
                      <TableCell className="text-right">{fmt(Number(p.custo))}</TableCell>
                      <TableCell className="text-right">{fmt(Number(p.preco))}</TableCell>
                      <TableCell className="text-right">{p.margemBruta.toFixed(1)}%</TableCell>
                      <TableCell className="text-right font-medium">{fmt(p.valorEstoque)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vendas" className="space-y-4">
          <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground uppercase">Total Vendas no Período</p><p className="text-xl font-bold text-primary mt-1">{fmt(totalVendas)} ({vendasReport.length} pedidos)</p></CardContent></Card>
          <Card>
            <CardContent className="p-4">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>#</TableHead><TableHead className="text-right">Total</TableHead><TableHead>NF</TableHead><TableHead>Data</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {vendasReport.map((v, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">#{v.numero}</TableCell>
                      <TableCell className="text-right font-medium">{fmt(v.total)}</TableCell>
                      <TableCell className="text-muted-foreground">{v.nota_fiscal || "—"}</TableCell>
                      <TableCell>{v.data}</TableCell>
                    </TableRow>
                  ))}
                  {vendasReport.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhuma venda no período</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Relatorios;
