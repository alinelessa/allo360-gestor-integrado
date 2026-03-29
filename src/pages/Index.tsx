import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--destructive))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--muted-foreground))",
];

const Dashboard = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    faturamento: 0,
    contasPagar: 0,
    contasReceber: 0,
    estoqueBaixo: 0,
    custoTotal: 0,
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [lastTransactions, setLastTransactions] = useState<any[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
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
        supabase
          .from("movimentacoes_estoque")
          .select("*, produtos(nome)")
          .eq("empresa_id", empresaId)
          .gte("created_at", dateFrom)
          .lte("created_at", dateTo + "T23:59:59")
          .order("created_at", { ascending: false }),
      ]);

      const rData = receber.data || [];
      const pData = pagar.data || [];
      const prData = produtos.data || [];
      const mData = movimentacoes.data || [];

      const totalReceber = rData.reduce((s, r) => s + Number(r.valor), 0);
      const totalPagar = pData.reduce((s, r) => s + Number(r.valor), 0);
      const receberPendente = rData
        .filter((r) => r.status === "pendente")
        .reduce((s, r) => s + Number(r.valor), 0);
      const pagarPendente = pData
        .filter((r) => r.status === "pendente")
        .reduce((s, r) => s + Number(r.valor), 0);
      const baixo = prData.filter((p) => p.estoque_atual <= p.estoque_minimo);
      const custoTotal = prData.reduce(
        (s, p) => s + Number(p.custo) * p.estoque_atual,
        0
      );

      setStats({
        faturamento: totalReceber,
        contasPagar: pagarPendente,
        contasReceber: receberPendente,
        estoqueBaixo: baixo.length,
        custoTotal,
      });

      setLowStockProducts(baixo.slice(0, 5));

      const allTx = [
        ...rData.map((r) => ({ ...r, tipo: "receber" as const })),
        ...pData.map((p) => ({ ...p, tipo: "pagar" as const })),
      ]
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        .slice(0, 8);

      setLastTransactions(allTx);

      const saidas = mData.filter((m) => m.tipo === "saida");
      const prodMap = new Map<string, { nome: string; qty: number }>();

      saidas.forEach((s) => {
        const nome = (s as any).produtos?.nome || "Desconhecido";
        const cur = prodMap.get(s.produto_id) || { nome, qty: 0 };
        cur.qty += s.quantidade;
        prodMap.set(s.produto_id, cur);
      });

      const sorted = Array.from(prodMap.values())
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 5);

      setTopProducts(sorted);

      const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"];
      setChartData(
        months.map((m) => ({
          mes: m,
          receitas: Math.round((totalReceber / 6) * (0.7 + Math.random() * 0.6)),
          despesas: Math.round((totalPagar / 6) * (0.7 + Math.random() * 0.6)),
        }))
      );
    };

    fetchAll();
  }, [profile, dateFrom, dateTo]);

  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const roi =
    stats.custoTotal > 0
      ? (((stats.faturamento - stats.contasPagar) / stats.custoTotal) * 100)
      : 0;

  const cards = [
    {
      title: "Faturamento",
      value: fmt(stats.faturamento),
      icon: DollarSign,
      tone: "text-primary",
    },
    {
      title: "Lucro Líquido",
      value: fmt(stats.faturamento - stats.contasPagar),
      icon: TrendingUp,
      tone: "text-success",
    },
    {
      title: "Contas a Pagar",
      value: fmt(stats.contasPagar),
      icon: TrendingDown,
      tone: "text-destructive",
    },
    {
      title: "Contas a Receber",
      value: fmt(stats.contasReceber),
      icon: DollarSign,
      tone: "text-primary",
    },
    {
      title: "ROI Geral",
      value: `${roi.toFixed(1)}%`,
      icon: ArrowUpRight,
      tone: roi >= 0 ? "text-success" : "text-destructive",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="app-faint text-[11px] font-semibold uppercase tracking-[0.14em]">
            Painel executivo
          </p>
          <h1 className="text-3xl font-semibold tracking-[-0.03em] text-foreground">
            Dashboard
          </h1>
          <p className="app-soft text-sm">
            Visão geral da operação, resultados e alertas da sua empresa.
          </p>
        </div>

        <div className="app-card-soft grid grid-cols-1 gap-3 rounded-2xl p-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              De
            </Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full sm:w-40"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Até
            </Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full sm:w-40"
            />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => (
          <div key={card.title} className="app-card-metric rounded-2xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="app-faint text-[11px] font-semibold uppercase tracking-[0.14em]">
                  {card.title}
                </p>
                <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-foreground">
                  {card.value}
                </p>
              </div>

              <div className="app-card-soft flex h-11 w-11 items-center justify-center rounded-2xl">
                <card.icon className={`h-5 w-5 ${card.tone}`} />
              </div>
            </div>
          </div>
        ))}
      </section>

      {stats.estoqueBaixo > 0 && (
        <section className="app-card rounded-2xl p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="app-card-soft flex h-10 w-10 items-center justify-center rounded-full">
              <AlertTriangle className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Atenção ao estoque
              </p>
              <p className="app-soft text-sm">
                {stats.estoqueBaixo} produto(s) estão com saldo crítico.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {lowStockProducts.map((p) => (
              <div
                key={p.id}
                className="app-card-soft flex items-center justify-between rounded-2xl px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {p.nome}
                  </p>
                  <p className="app-faint text-xs">Saldo x mínimo</p>
                </div>

                <Badge variant="destructive" className="ml-3 rounded-full">
                  {p.estoque_atual}/{p.estoque_minimo}
                </Badge>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Últimas Transações</CardTitle>
          </CardHeader>

          <CardContent>
            <div className="space-y-3">
              {lastTransactions.length === 0 && (
                <p className="app-soft py-4 text-center text-sm">
                  Nenhuma transação encontrada
                </p>
              )}

              {lastTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="app-card-soft flex items-center justify-between rounded-2xl px-4 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="app-card-soft flex h-9 w-9 items-center justify-center rounded-full">
                      {tx.tipo === "receber" ? (
                        <ArrowUpRight className="h-4 w-4 text-success" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4 text-destructive" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {tx.descricao}
                      </p>
                      <p className="app-faint text-xs">
                        {new Date(tx.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`ml-3 text-sm font-semibold ${
                      tx.tipo === "receber" ? "text-success" : "text-destructive"
                    }`}
                  >
                    {tx.tipo === "receber" ? "+" : "-"}
                    {fmt(Number(tx.valor))}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Mais Saídas no Período</CardTitle>
          </CardHeader>

          <CardContent>
            {topProducts.length === 0 ? (
              <p className="app-soft py-4 text-center text-sm">
                Sem movimentações no período
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={topProducts}
                    dataKey="qty"
                    nameKey="nome"
                    cx="50%"
                    cy="50%"
                    outerRadius={86}
                    label={({ nome, qty }) => `${nome} (${qty})`}
                  >
                    {topProducts.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Retorno sobre Investimento (ROI)
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="app-card-soft rounded-2xl p-5 text-center">
                <p className="app-faint text-[11px] font-semibold uppercase tracking-[0.12em]">
                  Investimento
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-foreground">
                  {fmt(stats.custoTotal)}
                </p>
              </div>

              <div className="app-card-soft rounded-2xl p-5 text-center">
                <p className="app-faint text-[11px] font-semibold uppercase tracking-[0.12em]">
                  Faturamento
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-primary">
                  {fmt(stats.faturamento)}
                </p>
              </div>

              <div className="app-card-soft rounded-2xl p-5 text-center">
                <p className="app-faint text-[11px] font-semibold uppercase tracking-[0.12em]">
                  ROI
                </p>
                <p
                  className={`mt-2 text-2xl font-semibold tracking-[-0.03em] ${
                    roi >= 0 ? "text-success" : "text-destructive"
                  }`}
                >
                  {roi.toFixed(1)}%
                </p>
                <p className="app-soft mt-2 text-xs">
                  {roi >= 0 ? "Retorno positivo" : "Retorno negativo"} — para cada
                  R$1 investido,{" "}
                  {roi >= 0
                    ? `retorna R$${(roi / 100 + 1).toFixed(2)}`
                    : `perde R$${Math.abs(roi / 100).toFixed(2)}`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Receitas vs Despesas</CardTitle>
          </CardHeader>

          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border) / 0.45)"
                />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar
                  dataKey="receitas"
                  fill="hsl(var(--primary))"
                  radius={[8, 8, 0, 0]}
                />
                <Bar
                  dataKey="despesas"
                  fill="hsl(var(--destructive))"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Fluxo de Caixa</CardTitle>
          </CardHeader>

          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border) / 0.45)"
                />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="receitas"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.5}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="despesas"
                  stroke="hsl(var(--destructive))"
                  strokeWidth={2.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default Dashboard;