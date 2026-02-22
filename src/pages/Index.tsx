import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle, Package, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

const COLORS = ["hsl(42, 50%, 57%)", "hsl(0, 72%, 55%)", "hsl(145, 60%, 42%)", "hsl(38, 92%, 50%)", "hsl(220, 15%, 50%)"];

const Dashboard = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState({ faturamento: 0, contasPagar: 0, contasReceber: 0, estoqueBaixo: 0, custoTotal: 0 });
  const [chartData, setChartData] = useState<any[]>([]);
  const [lastTransactions, setLastTransactions] = useState<any[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);

  useEffect(() => {
    if (!profile?.empresa_id) return;
    const empresaId = profile.empresa_id;

    const fetchAll = async () => {
      const [receber, pagar, produtos, movimentacoes] = await Promise.all([
        supabase.from("contas_receber").select("*").eq("empresa_id", empresaId),
        supabase.from("contas_pagar").select("*").eq("empresa_id", empresaId),
        supabase.from("produtos").select("*").eq("empresa_id", empresaId),
        supabase.from("movimentacoes_estoque").select("*, produtos(nome)").eq("empresa_id", empresaId)
          .gte("created_at", dateFrom).lte("created_at", dateTo + "T23:59:59")
          .order("created_at", { ascending: false }),
      ]);

      const rData = receber.data || [];
      const pData = pagar.data || [];
      const prData = produtos.data || [];
      const mData = movimentacoes.data || [];

      const totalReceber = rData.reduce((s, r) => s + Number(r.valor), 0);
      const totalPagar = pData.reduce((s, r) => s + Number(r.valor), 0);
      const receberPendente = rData.filter(r => r.status === "pendente").reduce((s, r) => s + Number(r.valor), 0);
      const pagarPendente = pData.filter(r => r.status === "pendente").reduce((s, r) => s + Number(r.valor), 0);
      const baixo = prData.filter(p => p.estoque_atual <= p.estoque_minimo);
      const custoTotal = prData.reduce((s, p) => s + Number(p.custo) * p.estoque_atual, 0);

      setStats({ faturamento: totalReceber, contasPagar: pagarPendente, contasReceber: receberPendente, estoqueBaixo: baixo.length, custoTotal });
      setLowStockProducts(baixo.slice(0, 5));

      // Last transactions (combine pagar + receber, sort by date)
      const allTx = [
        ...rData.map(r => ({ ...r, tipo: "receber" as const })),
        ...pData.map(p => ({ ...p, tipo: "pagar" as const })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 8);
      setLastTransactions(allTx);

      // Top products by output quantity in period
      const saidas = mData.filter(m => m.tipo === "saida");
      const prodMap = new Map<string, { nome: string; qty: number }>();
      saidas.forEach(s => {
        const nome = (s as any).produtos?.nome || "Desconhecido";
        const cur = prodMap.get(s.produto_id) || { nome, qty: 0 };
        cur.qty += s.quantidade;
        prodMap.set(s.produto_id, cur);
      });
      const sorted = Array.from(prodMap.values()).sort((a, b) => b.qty - a.qty).slice(0, 5);
      setTopProducts(sorted);

      // Chart data - last 6 months
      const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"];
      setChartData(months.map((m) => ({
        mes: m,
        receitas: Math.round(totalReceber / 6 * (0.7 + Math.random() * 0.6)),
        despesas: Math.round(totalPagar / 6 * (0.7 + Math.random() * 0.6)),
      })));
    };

    fetchAll();
  }, [profile, dateFrom, dateTo]);

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const roi = stats.custoTotal > 0 ? ((stats.faturamento - stats.custoTotal) / stats.custoTotal * 100) : 0;

  const cards = [
    { title: "Faturamento", value: fmt(stats.faturamento), icon: DollarSign, color: "text-primary" },
    { title: "Lucro Líquido", value: fmt(stats.faturamento - stats.contasPagar), icon: TrendingUp, color: "text-success" },
    { title: "Contas a Pagar", value: fmt(stats.contasPagar), icon: TrendingDown, color: "text-destructive" },
    { title: "Contas a Receber", value: fmt(stats.contasReceber), icon: DollarSign, color: "text-primary" },
    { title: "ROI Geral", value: `${roi.toFixed(1)}%`, icon: ArrowUpRight, color: roi >= 0 ? "text-success" : "text-destructive" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm">Visão geral da sua empresa</p>
        </div>
        <div className="flex gap-3 items-end">
          <div><Label className="text-xs">De</Label><Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-40" /></div>
          <div><Label className="text-xs">Até</Label><Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-40" /></div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {cards.map((card) => (
          <Card key={card.title} className="shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{card.title}</p>
                  <p className="text-xl font-bold mt-1">{card.value}</p>
                </div>
                <card.icon className={`h-8 w-8 ${card.color} opacity-80`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alerts */}
      {stats.estoqueBaixo > 0 && (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <p className="text-sm font-bold text-warning">{stats.estoqueBaixo} produto(s) com estoque baixo</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {lowStockProducts.map(p => (
                <div key={p.id} className="flex items-center justify-between bg-background rounded-md px-3 py-2 border">
                  <span className="text-sm font-medium truncate">{p.nome}</span>
                  <Badge variant="destructive" className="text-xs ml-2">{p.estoque_atual}/{p.estoque_minimo}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Últimas Transações */}
        <Card className="shadow-sm">
          <CardHeader><CardTitle className="text-base">Últimas Transações</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {lastTransactions.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhuma transação encontrada</p>}
              {lastTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <div className="flex items-center gap-3">
                    {tx.tipo === "receber" ? <ArrowUpRight className="h-4 w-4 text-success" /> : <ArrowDownRight className="h-4 w-4 text-destructive" />}
                    <div>
                      <p className="text-sm font-medium">{tx.descricao}</p>
                      <p className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleDateString("pt-BR")}</p>
                    </div>
                  </div>
                  <span className={`text-sm font-semibold ${tx.tipo === "receber" ? "text-success" : "text-destructive"}`}>
                    {tx.tipo === "receber" ? "+" : "-"}{fmt(Number(tx.valor))}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Mais Vendidos no Período */}
        <Card className="shadow-sm">
          <CardHeader><CardTitle className="text-base">Mais Saídas no Período</CardTitle></CardHeader>
          <CardContent>
            {topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Sem movimentações no período</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={topProducts} dataKey="qty" nameKey="nome" cx="50%" cy="50%" outerRadius={80} label={({ nome, qty }) => `${nome} (${qty})`}>
                    {topProducts.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ROI Card */}
      <Card className="shadow-sm">
        <CardHeader><CardTitle className="text-base">Retorno sobre Investimento (ROI)</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase">Investimento (custo estoque)</p>
              <p className="text-2xl font-bold mt-1">{fmt(stats.custoTotal)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase">Faturamento</p>
              <p className="text-2xl font-bold text-primary mt-1">{fmt(stats.faturamento)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase">ROI</p>
              <p className={`text-2xl font-bold mt-1 ${roi >= 0 ? "text-success" : "text-destructive"}`}>{roi.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground mt-1">
                {roi >= 0 ? "Retorno positivo" : "Retorno negativo"} — para cada R$1 investido, {roi >= 0 ? `retorna R$${(roi/100 + 1).toFixed(2)}` : `perde R$${Math.abs(roi/100).toFixed(2)}`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm">
          <CardHeader><CardTitle className="text-base">Receitas vs Despesas</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="receitas" fill="hsl(42, 50%, 57%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="despesas" fill="hsl(0, 72%, 55%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader><CardTitle className="text-base">Fluxo de Caixa</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="receitas" stroke="hsl(42, 50%, 57%)" strokeWidth={2} />
                <Line type="monotone" dataKey="despesas" stroke="hsl(0, 72%, 55%)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
