import { supabase } from "@/integrations/supabase/client";

export type AssistantMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

export type AssistantResponse = {
  reply: string;
  suggestions?: string[];
};

type AssistantContext = {
  empresaId: string | null;
  lojaId: string | null;
  lojaNome: string | null;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  roles: string[];
};

type DateRange = {
  start: string;
  end: string;
};

function normalizeQuestion(question: string) {
  return question.trim().toLowerCase();
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatPercent(value: number) {
  const signal = value > 0 ? "+" : "";
  return `${signal}${value.toFixed(1)}%`;
}

function formatDateBR(value?: string | null) {
  if (!value) return "sem data";
  return new Date(value).toLocaleDateString("pt-BR");
}

function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

function getStartOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getEndOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function toIsoRange(start: Date, end: Date): DateRange {
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

function getDateRangeForToday() {
  const now = new Date();
  return toIsoRange(getStartOfDay(now), getEndOfDay(now));
}

function getDateRange(periodKey: string): DateRange {
  const now = new Date();

  if (periodKey === "today") {
    return getDateRangeForToday();
  }

  if (periodKey === "yesterday") {
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    return toIsoRange(getStartOfDay(yesterday), getEndOfDay(yesterday));
  }

  if (periodKey === "this_week") {
    const current = new Date(now);
    const day = current.getDay();
    const diff = day === 0 ? 6 : day - 1;
    const start = new Date(current);
    start.setDate(current.getDate() - diff);
    return toIsoRange(getStartOfDay(start), getEndOfDay(now));
  }

  if (periodKey === "last_week") {
    const current = new Date(now);
    const day = current.getDay();
    const diff = day === 0 ? 6 : day - 1;

    const startThisWeek = new Date(current);
    startThisWeek.setDate(current.getDate() - diff);

    const startLastWeek = new Date(startThisWeek);
    startLastWeek.setDate(startThisWeek.getDate() - 7);

    const endLastWeek = new Date(startThisWeek);
    endLastWeek.setDate(startThisWeek.getDate() - 1);

    return toIsoRange(getStartOfDay(startLastWeek), getEndOfDay(endLastWeek));
  }

  if (periodKey === "this_month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return toIsoRange(getStartOfDay(start), getEndOfDay(now));
  }

  if (periodKey === "last_month") {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    return toIsoRange(getStartOfDay(start), getEndOfDay(end));
  }

  if (periodKey === "last_7_days") {
    const start = new Date(now);
    start.setDate(now.getDate() - 6);
    return toIsoRange(getStartOfDay(start), getEndOfDay(now));
  }

  if (periodKey === "previous_7_days") {
    const end = new Date(now);
    end.setDate(now.getDate() - 7);

    const start = new Date(end);
    start.setDate(end.getDate() - 6);

    return toIsoRange(getStartOfDay(start), getEndOfDay(end));
  }

  if (periodKey === "last_30_days") {
    const start = new Date(now);
    start.setDate(now.getDate() - 29);
    return toIsoRange(getStartOfDay(start), getEndOfDay(now));
  }

  if (periodKey === "previous_30_days") {
    const end = new Date(now);
    end.setDate(now.getDate() - 30);

    const start = new Date(end);
    start.setDate(end.getDate() - 29);

    return toIsoRange(getStartOfDay(start), getEndOfDay(end));
  }

  return getDateRange("this_month");
}

function getComparisonRange(periodKey: string) {
  const pairs: Record<string, string> = {
    today: "yesterday",
    this_week: "last_week",
    this_month: "last_month",
    last_7_days: "previous_7_days",
    last_30_days: "previous_30_days",
  };

  const currentKey = pairs[periodKey] ? periodKey : "this_month";
  const previousKey = pairs[currentKey] ?? "last_month";

  return {
    currentKey,
    previousKey,
    current: getDateRange(currentKey),
    previous: getDateRange(previousKey),
  };
}

function getRangeLabel(periodKey: string) {
  const labels: Record<string, string> = {
    today: "hoje",
    yesterday: "ontem",
    this_week: "esta semana",
    last_week: "semana passada",
    this_month: "este mês",
    last_month: "mês passado",
    last_7_days: "últimos 7 dias",
    previous_7_days: "7 dias anteriores",
    last_30_days: "últimos 30 dias",
    previous_30_days: "30 dias anteriores",
  };

  return labels[periodKey] ?? "o período informado";
}

function extractPeriodKey(question: string) {
  const q = normalizeQuestion(question);

  if (q.includes("hoje")) return "today";
  if (q.includes("ontem")) return "yesterday";
  if (q.includes("esta semana") || q.includes("essa semana")) return "this_week";
  if (q.includes("semana passada")) return "last_week";
  if (q.includes("mês passado") || q.includes("mes passado")) return "last_month";
  if (
    q.includes("este mês") ||
    q.includes("esse mês") ||
    q.includes("este mes") ||
    q.includes("esse mes")
  ) {
    return "this_month";
  }
  if (q.includes("últimos 7 dias") || q.includes("ultimos 7 dias")) return "last_7_days";
  if (q.includes("últimos 30 dias") || q.includes("ultimos 30 dias")) return "last_30_days";

  return "this_month";
}

function extractInactiveDays(question: string) {
  const q = normalizeQuestion(question);

  if (q.includes("90 dias")) return 90;
  if (q.includes("60 dias")) return 60;
  if (q.includes("45 dias")) return 45;
  if (q.includes("30 dias")) return 30;
  if (q.includes("15 dias")) return 15;

  return 30;
}

function wantsStoreComparison(question: string) {
  const q = normalizeQuestion(question);

  return (
    q.includes("qual loja") ||
    q.includes("loja vendeu mais") ||
    q.includes("loja mais vendeu") ||
    q.includes("melhor loja") ||
    q.includes("ranking de lojas") ||
    q.includes("por loja") ||
    q.includes("todas as lojas") ||
    q.includes("entre lojas")
  );
}

function wantsCompanyWide(question: string) {
  const q = normalizeQuestion(question);

  return (
    q.includes("empresa toda") ||
    q.includes("empresa inteira") ||
    q.includes("consolidado") ||
    q.includes("todas as lojas") ||
    q.includes("geral")
  );
}

function shouldUseActiveStore(question: string, context: AssistantContext) {
  if (!context.lojaId) return false;
  if (wantsStoreComparison(question)) return false;
  if (wantsCompanyWide(question)) return false;
  return true;
}

function getScopeLabel(question: string, context: AssistantContext) {
  if (shouldUseActiveStore(question, context) && context.lojaNome) {
    return `na loja ${context.lojaNome}`;
  }

  if (wantsStoreComparison(question)) {
    return "entre as lojas";
  }

  return "na empresa";
}

function getFallbackContext(): AssistantContext {
  return {
    empresaId: null,
    lojaId: null,
    lojaNome: null,
    userId: null,
    userName: null,
    userEmail: null,
    roles: [],
  };
}

function getNoCompanyReply(): AssistantResponse {
  return {
    reply: "Não consegui identificar a empresa ativa.",
    suggestions: ["Me dê um resumo de hoje"],
  };
}

function applyStoreFilter<TQuery>(
  query: TQuery,
  question: string,
  context: AssistantContext
) {
  if (!shouldUseActiveStore(question, context) || !context.lojaId) {
    return query as any;
  }

  return (query as any).eq("loja_id", context.lojaId);
}

async function getLowStockSummary(
  context: AssistantContext,
  question = ""
): Promise<AssistantResponse> {
  if (!context.empresaId) return getNoCompanyReply();

  let query = supabase
    .from("produtos")
    .select("id, nome, estoque_atual, estoque_minimo, deleted_at, loja_id")
    .eq("empresa_id", context.empresaId)
    .is("deleted_at", null);

  query = applyStoreFilter(query, question, context);

  const { data, error } = await query;

  if (error) {
    return {
      reply: `Tive um problema ao consultar o estoque: ${error.message}`,
      suggestions: ["Me dê um resumo de hoje"],
    };
  }

  const lowStock =
    data?.filter(
      (item: any) =>
        Number(item.estoque_atual ?? 0) <= Number(item.estoque_minimo ?? 0)
    ) ?? [];

  if (lowStock.length === 0) {
    return {
      reply: `Não encontrei produtos com estoque abaixo do mínimo ${getScopeLabel(
        question,
        context
      )}.`,
      suggestions: ["Quem está devendo?", "Me dê um resumo de hoje"],
    };
  }

  const top = lowStock
    .slice(0, 5)
    .map(
      (item: any) =>
        `${item.nome} (${Number(item.estoque_atual ?? 0)}/${Number(
          item.estoque_minimo ?? 0
        )})`
    )
    .join(", ");

  return {
    reply: `Encontrei ${lowStock.length} produto(s) com estoque baixo ${getScopeLabel(
      question,
      context
    )}. Os mais críticos são: ${top}.`,
    suggestions: [
      "Produtos com mais saídas",
      "Me dê um resumo de hoje",
      "Qual foi meu faturamento este mês?",
    ],
  };
}

async function getOpenReceivablesSummary(
  context: AssistantContext,
  question = ""
): Promise<AssistantResponse> {
  if (!context.empresaId) return getNoCompanyReply();

  let query = supabase
    .from("contas_receber")
    .select(
      "id, descricao, valor, status, data_vencimento, cliente_id, deleted_at, loja_id"
    )
    .eq("empresa_id", context.empresaId)
    .is("deleted_at", null)
    .neq("status", "pago");

  query = applyStoreFilter(query, question, context);

  const { data, error } = await query;

  if (error) {
    return {
      reply: `Tive um problema ao consultar contas a receber: ${error.message}`,
      suggestions: ["Me dê um resumo de hoje"],
    };
  }

  const total = (data ?? []).reduce(
    (sum: number, item: any) => sum + Number(item.valor ?? 0),
    0
  );

  if (!data || data.length === 0) {
    return {
      reply: `No momento não há contas a receber em aberto ${getScopeLabel(
        question,
        context
      )}.`,
      suggestions: ["Quais contas estão pra vencer?", "Me dê um resumo de hoje"],
    };
  }

  const proximas = [...data]
    .sort((a: any, b: any) => {
      const aTime = a.data_vencimento
        ? new Date(a.data_vencimento).getTime()
        : Infinity;
      const bTime = b.data_vencimento
        ? new Date(b.data_vencimento).getTime()
        : Infinity;
      return aTime - bTime;
    })
    .slice(0, 3)
    .map((item: any) => {
      const venc = item.data_vencimento
        ? new Date(item.data_vencimento).toLocaleDateString("pt-BR")
        : "sem vencimento";

      return `${item.descricao ?? "Sem descrição"} (${formatCurrency(
        Number(item.valor ?? 0)
      )}, venc. ${venc})`;
    })
    .join(", ");

  return {
    reply: `Você tem ${data.length} conta(s) a receber em aberto ${getScopeLabel(
      question,
      context
    )}, somando ${formatCurrency(total)}. As próximas são: ${proximas}.`,
    suggestions: [
      "Quais contas estão pra vencer?",
      "Quem está devendo?",
      "Me dê um resumo de hoje",
    ],
  };
}

async function getUpcomingReceivablesSummary(
  context: AssistantContext,
  question = ""
): Promise<AssistantResponse> {
  if (!context.empresaId) return getNoCompanyReply();

  const today = new Date();
  const endDate = new Date();
  endDate.setDate(today.getDate() + 7);

  const start = today.toISOString().split("T")[0];
  const end = endDate.toISOString().split("T")[0];

  let query = supabase
    .from("contas_receber")
    .select(`
      id,
      descricao,
      valor,
      status,
      data_vencimento,
      deleted_at,
      loja_id,
      clientes (
        nome
      )
    `)
    .eq("empresa_id", context.empresaId)
    .is("deleted_at", null)
    .neq("status", "pago")
    .gte("data_vencimento", start)
    .lte("data_vencimento", end)
    .order("data_vencimento", { ascending: true });

  query = applyStoreFilter(query, question, context);

  const { data, error } = await query;

  if (error) {
    return {
      reply: `Tive um problema ao consultar contas a vencer: ${error.message}`,
      suggestions: ["Quanto tenho a receber em aberto?"],
    };
  }

  if (!data || data.length === 0) {
    return {
      reply: `Não encontrei contas a vencer nos próximos 7 dias ${getScopeLabel(
        question,
        context
      )}.`,
      suggestions: ["Quanto tenho a receber em aberto?", "Me dê um resumo de hoje"],
    };
  }

  const total = data.reduce(
    (sum: number, item: any) => sum + Number(item.valor ?? 0),
    0
  );

  const lista = data
    .slice(0, 5)
    .map((item: any) => {
      const cliente = item.clientes?.nome ?? "Cliente";
      return `• ${cliente} — ${formatCurrency(Number(item.valor ?? 0))} (venc. ${formatDateBR(
        item.data_vencimento
      )})`;
    })
    .join("\n");

  return {
    reply: `Encontrei ${data.length} conta(s) a vencer nos próximos 7 dias ${getScopeLabel(
      question,
      context
    )}, somando ${formatCurrency(total)}:\n\n${lista}`,
    suggestions: [
      "Quanto tenho a receber em aberto?",
      "Quais contas estão vencidas?",
      "Me dê um resumo de hoje",
    ],
  };
}

async function getDebtorsSummary(
  context: AssistantContext,
  question = ""
): Promise<AssistantResponse> {
  if (!context.empresaId) return getNoCompanyReply();

  const hoje = getTodayDate();

  let query = supabase
    .from("contas_receber")
    .select(`
      id,
      valor,
      status,
      data_vencimento,
      cliente_id,
      deleted_at,
      loja_id,
      clientes (
        nome
      )
    `)
    .eq("empresa_id", context.empresaId)
    .is("deleted_at", null)
    .lt("data_vencimento", hoje)
    .neq("status", "pago");

  query = applyStoreFilter(query, question, context);

  const { data, error } = await query;

  if (error) {
    return {
      reply: `Tive um problema ao consultar clientes com atraso: ${error.message}`,
      suggestions: ["Quais contas estão vencidas?"],
    };
  }

  if (!data || data.length === 0) {
    return {
      reply: `Nenhum cliente com contas vencidas no momento ${getScopeLabel(
        question,
        context
      )} 🎉`,
      suggestions: ["Quais contas estão vencidas?", "Me dê um resumo de hoje"],
    };
  }

  const mapa: Record<string, number> = {};

  data.forEach((item: any) => {
    const nome = item.clientes?.nome ?? "Cliente";
    mapa[nome] = (mapa[nome] || 0) + Number(item.valor ?? 0);
  });

  const lista = Object.entries(mapa)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([nome, valor]) => `• ${nome}: ${formatCurrency(valor)}`)
    .join("\n");

  return {
    reply: `Clientes com valores em atraso ${getScopeLabel(
      question,
      context
    )}:\n\n${lista}`,
    suggestions: [
      "Quais contas estão vencidas?",
      "Quanto tenho a receber em aberto?",
      "Quais contas estão pra vencer?",
    ],
  };
}

async function getOverdueBillsSummary(
  context: AssistantContext,
  question = ""
): Promise<AssistantResponse> {
  if (!context.empresaId) return getNoCompanyReply();

  const hoje = getTodayDate();

  let query = supabase
    .from("contas_receber")
    .select(`
      id,
      descricao,
      valor,
      status,
      data_vencimento,
      deleted_at,
      loja_id,
      clientes (
        nome
      )
    `)
    .eq("empresa_id", context.empresaId)
    .is("deleted_at", null)
    .lt("data_vencimento", hoje)
    .neq("status", "pago")
    .order("data_vencimento", { ascending: true });

  query = applyStoreFilter(query, question, context);

  const { data, error } = await query;

  if (error) {
    return {
      reply: `Tive um problema ao consultar contas vencidas: ${error.message}`,
      suggestions: ["Quem está devendo?"],
    };
  }

  if (!data || data.length === 0) {
    return {
      reply: `Não encontrei contas vencidas ${getScopeLabel(
        question,
        context
      )}.`,
      suggestions: ["Quem está devendo?", "Me dê um resumo de hoje"],
    };
  }

  const lista = data
    .slice(0, 5)
    .map((item: any) => {
      const cliente = item.clientes?.nome ?? "Cliente";
      const venc = item.data_vencimento
        ? new Date(item.data_vencimento).toLocaleDateString("pt-BR")
        : "sem data";
      return `• ${cliente} — ${formatCurrency(
        Number(item.valor ?? 0)
      )} (venc. ${venc})`;
    })
    .join("\n");

  return {
    reply: `Encontrei ${data.length} conta(s) vencida(s) ${getScopeLabel(
      question,
      context
    )}:\n\n${lista}`,
    suggestions: [
      "Quem está devendo?",
      "Quanto tenho a receber em aberto?",
      "Quais contas estão pra vencer?",
    ],
  };
}

async function getTodaySummary(
  context: AssistantContext,
  question = ""
): Promise<AssistantResponse> {
  if (!context.empresaId) return getNoCompanyReply();

  const { start, end } = getDateRangeForToday();

  let vendasQuery = supabase
    .from("pedidos_venda")
    .select("id, total, created_at, deleted_at, loja_id")
    .eq("empresa_id", context.empresaId)
    .is("deleted_at", null)
    .gte("created_at", start)
    .lte("created_at", end);

  let receberQuery = supabase
    .from("contas_receber")
    .select("id, valor, status, deleted_at, loja_id")
    .eq("empresa_id", context.empresaId)
    .is("deleted_at", null)
    .neq("status", "pago");

  let estoqueQuery = supabase
    .from("produtos")
    .select("id, estoque_atual, estoque_minimo, deleted_at, loja_id")
    .eq("empresa_id", context.empresaId)
    .is("deleted_at", null);

  vendasQuery = applyStoreFilter(vendasQuery, question, context);
  receberQuery = applyStoreFilter(receberQuery, question, context);
  estoqueQuery = applyStoreFilter(estoqueQuery, question, context);

  const [vendasRes, receberRes, estoqueRes] = await Promise.all([
    vendasQuery,
    receberQuery,
    estoqueQuery,
  ]);

  if (vendasRes.error || receberRes.error || estoqueRes.error) {
    return {
      reply: `Erro no resumo:
vendas: ${vendasRes.error?.message ?? "ok"}
receber: ${receberRes.error?.message ?? "ok"}
estoque: ${estoqueRes.error?.message ?? "ok"}`,
      suggestions: [
        "Como está meu estoque baixo?",
        "Quanto tenho a receber em aberto?",
      ],
    };
  }

  const vendas = vendasRes.data ?? [];
  const contas = receberRes.data ?? [];
  const produtos = estoqueRes.data ?? [];

  const faturamentoHoje = vendas.reduce(
    (sum: number, item: any) => sum + Number(item.total ?? 0),
    0
  );

  const totalReceber = contas.reduce(
    (sum: number, item: any) => sum + Number(item.valor ?? 0),
    0
  );

  const estoqueBaixo = produtos.filter(
    (item: any) =>
      Number(item.estoque_atual ?? 0) <= Number(item.estoque_minimo ?? 0)
  ).length;

  return {
    reply: `Resumo de hoje ${getScopeLabel(
      question,
      context
    )}: ${vendas.length} pedido(s) de venda, faturamento de ${formatCurrency(
      faturamentoHoje
    )}, ${contas.length} conta(s) a receber em aberto somando ${formatCurrency(
      totalReceber
    )} e ${estoqueBaixo} produto(s) com estoque crítico.`,
    suggestions: [
      "Quem está devendo?",
      "Quais contas estão vencidas?",
      "Como está meu estoque baixo?",
    ],
  };
}

async function getTopProductsSummary(
  context: AssistantContext,
  question = ""
): Promise<AssistantResponse> {
  if (!context.empresaId) return getNoCompanyReply();

  const periodKey = extractPeriodKey(question);
  const { start, end } = getDateRange(periodKey);

  let query = supabase
    .from("movimentacoes_estoque")
    .select(`
      produto_id,
      quantidade,
      tipo,
      created_at,
      loja_id,
      produtos (
        nome
      )
    `)
    .eq("empresa_id", context.empresaId)
    .eq("tipo", "saida")
    .gte("created_at", start)
    .lte("created_at", end);

  query = applyStoreFilter(query, question, context);

  const { data, error } = await query;

  if (error) {
    return {
      reply: `Tive um problema ao consultar as movimentações: ${error.message}`,
      suggestions: ["Me dê um resumo de hoje"],
    };
  }

  if (!data || data.length === 0) {
    return {
      reply: `Não encontrei saídas de estoque em ${getRangeLabel(
        periodKey
      )} ${getScopeLabel(question, context)}.`,
      suggestions: ["Como está meu estoque baixo?", "Me dê um resumo de hoje"],
    };
  }

  const map = new Map<string, { nome: string; qty: number }>();

  data.forEach((item: any) => {
    const key = item.produto_id;
    const nome = item.produtos?.nome ?? "Produto";
    const current = map.get(key) ?? { nome, qty: 0 };
    current.qty += Number(item.quantidade ?? 0);
    map.set(key, current);
  });

  const top = Array.from(map.values())
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  return {
    reply: `Produtos com mais saídas em ${getRangeLabel(periodKey)} ${getScopeLabel(
      question,
      context
    )}:\n\n${top.map((item) => `• ${item.nome}: ${item.qty}`).join("\n")}`,
    suggestions: [
      "Como está meu estoque baixo?",
      "Qual foi meu faturamento este mês?",
      "Me dê um resumo de hoje",
    ],
  };
}

async function getRevenueSummary(
  context: AssistantContext,
  question = ""
): Promise<AssistantResponse> {
  if (!context.empresaId) return getNoCompanyReply();

  const periodKey = extractPeriodKey(question);
  const { start, end } = getDateRange(periodKey);

  let query = supabase
    .from("pedidos_venda")
    .select("id, total, created_at, deleted_at, loja_id")
    .eq("empresa_id", context.empresaId)
    .is("deleted_at", null)
    .gte("created_at", start)
    .lte("created_at", end);

  query = applyStoreFilter(query, question, context);

  const { data, error } = await query;

  if (error) {
    return {
      reply: `Tive um problema ao consultar o faturamento: ${error.message}`,
      suggestions: ["Me dê um resumo de hoje"],
    };
  }

  const vendas = data ?? [];
  const total = vendas.reduce(
    (sum: number, item: any) => sum + Number(item.total ?? 0),
    0
  );

  return {
    reply: `O faturamento em ${getRangeLabel(periodKey)} ${getScopeLabel(
      question,
      context
    )} foi de ${formatCurrency(total)}, em ${vendas.length} pedido(s).`,
    suggestions: [
      "Compare com o mês passado",
      "Qual loja vendeu mais?",
      "Clientes que mais compram",
    ],
  };
}

async function getRevenueComparison(
  context: AssistantContext,
  question = ""
): Promise<AssistantResponse> {
  if (!context.empresaId) return getNoCompanyReply();

  const requestedPeriod = extractPeriodKey(question);
  const { currentKey, previousKey, current, previous } =
    getComparisonRange(requestedPeriod);

  let currentQuery = supabase
    .from("pedidos_venda")
    .select("total, loja_id")
    .eq("empresa_id", context.empresaId)
    .is("deleted_at", null)
    .gte("created_at", current.start)
    .lte("created_at", current.end);

  let previousQuery = supabase
    .from("pedidos_venda")
    .select("total, loja_id")
    .eq("empresa_id", context.empresaId)
    .is("deleted_at", null)
    .gte("created_at", previous.start)
    .lte("created_at", previous.end);

  currentQuery = applyStoreFilter(currentQuery, question, context);
  previousQuery = applyStoreFilter(previousQuery, question, context);

  const [currentRes, previousRes] = await Promise.all([currentQuery, previousQuery]);

  if (currentRes.error || previousRes.error) {
    return {
      reply: `Tive um problema ao comparar períodos:
atual: ${currentRes.error?.message ?? "ok"}
anterior: ${previousRes.error?.message ?? "ok"}`,
      suggestions: ["Qual foi meu faturamento este mês?"],
    };
  }

  const totalCurrent = (currentRes.data ?? []).reduce(
    (sum: number, item: any) => sum + Number(item.total ?? 0),
    0
  );

  const totalPrevious = (previousRes.data ?? []).reduce(
    (sum: number, item: any) => sum + Number(item.total ?? 0),
    0
  );

  const diff = totalCurrent - totalPrevious;
  const percent =
    totalPrevious > 0 ? (diff / totalPrevious) * 100 : totalCurrent > 0 ? 100 : 0;

  return {
    reply: `Comparação de faturamento ${getScopeLabel(question, context)}:
• ${getRangeLabel(currentKey)}: ${formatCurrency(totalCurrent)}
• ${getRangeLabel(previousKey)}: ${formatCurrency(totalPrevious)}

Variação: ${formatPercent(percent)} (${diff >= 0 ? "+" : ""}${formatCurrency(
      diff
    )})`,
    suggestions: [
      "Qual loja vendeu mais?",
      "Qual foi meu faturamento este mês?",
      "Me dê um resumo de hoje",
    ],
  };
}

async function getRevenueByStore(
  context: AssistantContext,
  question = ""
): Promise<AssistantResponse> {
  if (!context.empresaId) return getNoCompanyReply();

  const periodKey = extractPeriodKey(question);
  const { start, end } = getDateRange(periodKey);

  const { data, error } = await supabase
    .from("pedidos_venda")
    .select(`
      loja_id,
      total,
      lojas (
        nome
      )
    `)
    .eq("empresa_id", context.empresaId)
    .is("deleted_at", null)
    .gte("created_at", start)
    .lte("created_at", end);

  if (error) {
    return {
      reply: `Tive um problema ao consultar o faturamento por loja: ${error.message}`,
      suggestions: ["Qual foi meu faturamento este mês?"],
    };
  }

  if (!data || data.length === 0) {
    return {
      reply: `Não encontrei vendas por loja em ${getRangeLabel(periodKey)}.`,
      suggestions: ["Qual foi meu faturamento este mês?"],
    };
  }

  const map = new Map<string, { nome: string; total: number }>();

  data.forEach((item: any) => {
    const key = item.loja_id ?? "sem_loja";
    const nome = item.lojas?.nome ?? "Sem loja";

    const current = map.get(key) ?? { nome, total: 0 };
    current.total += Number(item.total ?? 0);
    map.set(key, current);
  });

  const ranking = Array.from(map.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)
    .map((item, index) => `${index + 1}. ${item.nome}: ${formatCurrency(item.total)}`)
    .join("\n");

  return {
    reply: `Faturamento por loja em ${getRangeLabel(periodKey)}:\n\n${ranking}`,
    suggestions: [
      "Qual loja vendeu mais?",
      "Compare com o mês passado",
      "Clientes que mais compram",
    ],
  };
}

async function getBestStore(
  context: AssistantContext,
  question = ""
): Promise<AssistantResponse> {
  if (!context.empresaId) return getNoCompanyReply();

  const periodKey = extractPeriodKey(question);
  const { start, end } = getDateRange(periodKey);

  const { data, error } = await supabase
    .from("pedidos_venda")
    .select(`
      loja_id,
      total,
      lojas (
        nome
      )
    `)
    .eq("empresa_id", context.empresaId)
    .is("deleted_at", null)
    .gte("created_at", start)
    .lte("created_at", end);

  if (error) {
    return {
      reply: `Tive um problema ao identificar a loja com melhor desempenho: ${error.message}`,
      suggestions: ["Faturamento por loja"],
    };
  }

  if (!data || data.length === 0) {
    return {
      reply: `Não encontrei vendas por loja em ${getRangeLabel(periodKey)}.`,
      suggestions: ["Qual foi meu faturamento este mês?"],
    };
  }

  const map = new Map<string, { nome: string; total: number }>();

  data.forEach((item: any) => {
    const key = item.loja_id ?? "sem_loja";
    const nome = item.lojas?.nome ?? "Sem loja";

    const current = map.get(key) ?? { nome, total: 0 };
    current.total += Number(item.total ?? 0);
    map.set(key, current);
  });

  const ranking = Array.from(map.values()).sort((a, b) => b.total - a.total);
  const top = ranking[0];

  return {
    reply: `A loja com maior faturamento em ${getRangeLabel(periodKey)} foi ${top.nome}, com ${formatCurrency(
      top.total
    )}.`,
    suggestions: [
      "Faturamento por loja",
      "Compare com o mês passado",
      "Me dê um resumo de hoje",
    ],
  };
}

async function getTopCustomersSummary(
  context: AssistantContext,
  question = ""
): Promise<AssistantResponse> {
  if (!context.empresaId) return getNoCompanyReply();

  const periodKey = extractPeriodKey(question);
  const { start, end } = getDateRange(periodKey);

  let query = supabase
    .from("pedidos_venda")
    .select(`
      cliente_id,
      total,
      created_at,
      loja_id,
      clientes (
        nome
      )
    `)
    .eq("empresa_id", context.empresaId)
    .is("deleted_at", null)
    .gte("created_at", start)
    .lte("created_at", end);

  query = applyStoreFilter(query, question, context);

  const { data, error } = await query;

  if (error) {
    return {
      reply: `Tive um problema ao consultar os clientes: ${error.message}`,
      suggestions: ["Qual foi meu faturamento este mês?"],
    };
  }

  if (!data || data.length === 0) {
    return {
      reply: `Não encontrei compras de clientes em ${getRangeLabel(periodKey)} ${getScopeLabel(
        question,
        context
      )}.`,
      suggestions: ["Qual foi meu faturamento este mês?"],
    };
  }

  const map = new Map<string, { nome: string; total: number; pedidos: number }>();

  data.forEach((item: any) => {
    const key = item.cliente_id ?? "sem_cliente";
    const nome = item.clientes?.nome ?? "Cliente não identificado";
    const current = map.get(key) ?? { nome, total: 0, pedidos: 0 };
    current.total += Number(item.total ?? 0);
    current.pedidos += 1;
    map.set(key, current);
  });

  const ranking = Array.from(map.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)
    .map(
      (item, index) =>
        `${index + 1}. ${item.nome}: ${formatCurrency(item.total)} em ${
          item.pedidos
        } pedido(s)`
    )
    .join("\n");

  return {
    reply: `Clientes que mais compraram em ${getRangeLabel(periodKey)} ${getScopeLabel(
      question,
      context
    )}:\n\n${ranking}`,
    suggestions: [
      "Clientes sem comprar há 30 dias",
      "Qual foi meu faturamento este mês?",
      "Quem está devendo?",
    ],
  };
}

async function getInactiveCustomersSummary(
  context: AssistantContext,
  question = ""
): Promise<AssistantResponse> {
  if (!context.empresaId) return getNoCompanyReply();

  const days = extractInactiveDays(question);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffIso = cutoff.toISOString();

  let clientesQuery = supabase
    .from("clientes")
    .select("id, nome, loja_id, deleted_at")
    .eq("empresa_id", context.empresaId)
    .is("deleted_at", null);

  let pedidosQuery = supabase
    .from("pedidos_venda")
    .select("cliente_id, created_at, loja_id")
    .eq("empresa_id", context.empresaId)
    .is("deleted_at", null)
    .not("cliente_id", "is", null);

  clientesQuery = applyStoreFilter(clientesQuery, question, context);
  pedidosQuery = applyStoreFilter(pedidosQuery, question, context);

  const [clientesRes, pedidosRes] = await Promise.all([clientesQuery, pedidosQuery]);

  if (clientesRes.error || pedidosRes.error) {
    return {
      reply: `Tive um problema ao consultar clientes inativos:
clientes: ${clientesRes.error?.message ?? "ok"}
pedidos: ${pedidosRes.error?.message ?? "ok"}`,
      suggestions: ["Clientes que mais compram"],
    };
  }

  const clientes = clientesRes.data ?? [];
  const pedidos = pedidosRes.data ?? [];

  const lastPurchaseMap = new Map<string, string>();

  pedidos.forEach((pedido: any) => {
    if (!pedido.cliente_id) return;

    const existing = lastPurchaseMap.get(pedido.cliente_id);
    const currentDate = pedido.created_at;

    if (!existing || new Date(currentDate) > new Date(existing)) {
      lastPurchaseMap.set(pedido.cliente_id, currentDate);
    }
  });

  const inactive = clientes.filter((cliente: any) => {
    const lastPurchase = lastPurchaseMap.get(cliente.id);
    if (!lastPurchase) return true;
    return new Date(lastPurchase) < new Date(cutoffIso);
  });

  if (inactive.length === 0) {
    return {
      reply: `Não encontrei clientes sem comprar há ${days} dias ${getScopeLabel(
        question,
        context
      )}.`,
      suggestions: ["Clientes que mais compram", "Qual foi meu faturamento este mês?"],
    };
  }

  const lista = inactive
    .slice(0, 10)
    .map((cliente: any) => {
      const lastPurchase = lastPurchaseMap.get(cliente.id);
      return `• ${cliente.nome} — última compra: ${
        lastPurchase ? formatDateBR(lastPurchase) : "nunca comprou"
      }`;
    })
    .join("\n");

  return {
    reply: `Clientes sem comprar há ${days} dias ${getScopeLabel(
      question,
      context
    )}:\n\n${lista}`,
    suggestions: [
      "Clientes que mais compram",
      "Qual foi meu faturamento este mês?",
      "Quem está devendo?",
    ],
  };
}

async function getTopProductsRevenueSummary(
  context: AssistantContext,
  question = ""
): Promise<AssistantResponse> {
  if (!context.empresaId) return getNoCompanyReply();

  const periodKey = extractPeriodKey(question);
  const { start, end } = getDateRange(periodKey);

  let query = supabase
    .from("pedido_venda_itens")
    .select(`
      produto_id,
      subtotal,
      pedidos_venda!inner (
        empresa_id,
        created_at,
        loja_id,
        deleted_at
      ),
      produtos (
        nome
      )
    `)
    .eq("empresa_id", context.empresaId);

  const { data, error } = await query;

  if (error) {
    return {
      reply: `Tive um problema ao consultar produtos com maior faturamento: ${error.message}`,
      suggestions: ["Produtos com mais saídas"],
    };
  }

  const filtered =
    data?.filter((item: any) => {
      const venda = item.pedidos_venda;
      if (!venda) return false;
      if (venda.deleted_at) return false;

      const createdAt = new Date(venda.created_at).getTime();
      const inPeriod =
        createdAt >= new Date(start).getTime() &&
        createdAt <= new Date(end).getTime();

      if (!inPeriod) return false;

      if (shouldUseActiveStore(question, context) && context.lojaId) {
        return venda.loja_id === context.lojaId;
      }

      return true;
    }) ?? [];

  if (filtered.length === 0) {
    return {
      reply: `Não encontrei faturamento por produto em ${getRangeLabel(
        periodKey
      )} ${getScopeLabel(question, context)}.`,
      suggestions: ["Produtos com mais saídas", "Qual foi meu faturamento este mês?"],
    };
  }

  const map = new Map<string, number>();

  filtered.forEach((item: any) => {
    const nome = item.produtos?.nome ?? "Produto";
    map.set(nome, (map.get(nome) ?? 0) + Number(item.subtotal ?? 0));
  });

  const top = [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return {
    reply: `Produtos com maior faturamento em ${getRangeLabel(periodKey)} ${getScopeLabel(
      question,
      context
    )}:\n\n${top
      .map((item, index) => `${index + 1}. ${item[0]}: ${formatCurrency(item[1])}`)
      .join("\n")}`,
    suggestions: [
      "Produtos com mais saídas",
      "Qual foi meu faturamento este mês?",
      "Clientes que mais compram",
    ],
  };
}

async function getTopSuppliersSummary(
  context: AssistantContext,
  question = ""
): Promise<AssistantResponse> {
  if (!context.empresaId) return getNoCompanyReply();

  const periodKey = extractPeriodKey(question);
  const { start, end } = getDateRange(periodKey);

  let query = supabase
    .from("contas_pagar")
    .select(`
      valor,
      data_vencimento,
      fornecedor_id,
      empresa_id,
      fornecedores (
        nome
      )
    `)
    .eq("empresa_id", context.empresaId);

  const { data, error } = await query;

  if (error) {
    return {
      reply: `Tive um problema ao consultar fornecedores: ${error.message}`,
      suggestions: ["Qual foi meu faturamento este mês?"],
    };
  }

  const filtered =
    data?.filter((item: any) => {
      if (!item.data_vencimento) return true;

      const time = new Date(item.data_vencimento).getTime();
      return (
        time >= new Date(start).getTime() &&
        time <= new Date(end).getTime()
      );
    }) ?? [];

  if (filtered.length === 0) {
    return {
      reply: `Não encontrei movimentação de fornecedores em ${getRangeLabel(periodKey)}.`,
      suggestions: ["Qual foi meu faturamento este mês?"],
    };
  }

  const map = new Map<string, number>();

  filtered.forEach((item: any) => {
    const nome = item.fornecedores?.nome ?? "Fornecedor";
    map.set(nome, (map.get(nome) ?? 0) + Number(item.valor ?? 0));
  });

  const top = [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return {
    reply: `Fornecedores com maior volume em ${getRangeLabel(periodKey)}:\n\n${top
      .map((item, index) => `${index + 1}. ${item[0]}: ${formatCurrency(item[1])}`)
      .join("\n")}`,
    suggestions: [
      "Qual foi meu faturamento este mês?",
      "Clientes que mais compram",
      "Produtos com maior faturamento",
    ],
  };
}

export async function askAssistant(
  question: string,
  context?: AssistantContext
): Promise<AssistantResponse> {
  const q = normalizeQuestion(question);
  const safeContext = context ?? getFallbackContext();

  if (
    q.includes("loja vendeu mais") ||
    q.includes("loja mais vendeu") ||
    q.includes("melhor loja") ||
    q.includes("qual loja vendeu mais")
  ) {
    return getBestStore(safeContext, q);
  }

  if (
    q.includes("faturamento por loja") ||
    q.includes("vendas por loja") ||
    q.includes("ranking de lojas") ||
    q.includes("todas as lojas")
  ) {
    return getRevenueByStore(safeContext, q);
  }

  if (
    q.includes("compare") ||
    q.includes("comparar") ||
    q.includes("comparação") ||
    q.includes("comparacao") ||
    q.includes("mês passado") ||
    q.includes("mes passado")
  ) {
    return getRevenueComparison(safeContext, q);
  }

  if (
    q.includes("clientes que mais compram") ||
    q.includes("clientes que mais compraram") ||
    q.includes("melhores clientes") ||
    q.includes("top clientes")
  ) {
    return getTopCustomersSummary(safeContext, q);
  }

  if (
    q.includes("sem comprar") ||
    q.includes("inativos") ||
    q.includes("não compram") ||
    q.includes("nao compram")
  ) {
    return getInactiveCustomersSummary(safeContext, q);
  }

  if (
    q.includes("pra vencer") ||
    q.includes("para vencer") ||
    q.includes("a vencer") ||
    q.includes("vencem")
  ) {
    return getUpcomingReceivablesSummary(safeContext, q);
  }

  if (
    q.includes("fornecedor") ||
    q.includes("fornecedores")
  ) {
    return getTopSuppliersSummary(safeContext, q);
  }

  if (
    q.includes("maior faturamento por produto") ||
    q.includes("produtos com maior faturamento") ||
    q.includes("produtos que mais faturam")
  ) {
    return getTopProductsRevenueSummary(safeContext, q);
  }

  if (
    q.includes("devendo") ||
    q.includes("inadimplente") ||
    q.includes("quem deve") ||
    q.includes("quem está devendo") ||
    q.includes("clientes devendo")
  ) {
    return getDebtorsSummary(safeContext, q);
  }

  if (
    q.includes("contas vencidas") ||
    q.includes("vencidas") ||
    q.includes("vencidos") ||
    q.includes("atrasadas")
  ) {
    return getOverdueBillsSummary(safeContext, q);
  }

  if (q.includes("estoque")) {
    return getLowStockSummary(safeContext, q);
  }

  if (
    q.includes("receber") ||
    q.includes("financeiro") ||
    q.includes("cobran") ||
    q.includes("aberto")
  ) {
    return getOpenReceivablesSummary(safeContext, q);
  }

  if (
    q.includes("faturamento") ||
    q.includes("vendas") ||
    q.includes("vendi")
  ) {
    return getRevenueSummary(safeContext, q);
  }

  if (q.includes("resumo") || q.includes("hoje")) {
    return getTodaySummary(safeContext, q);
  }

  if (
    q.includes("saídas") ||
    q.includes("saidas") ||
    q.includes("mais vendidos") ||
    q.includes("movimenta") ||
    q.includes("produtos que mais saem")
  ) {
    return getTopProductsSummary(safeContext, q);
  }

  return {
    reply:
      "Já consigo responder sobre faturamento, comparação com período anterior, loja que mais vendeu, faturamento por loja, clientes que mais compram, clientes inativos, contas vencidas, contas a vencer, contas a receber, estoque baixo, resumo do dia, produtos com mais saídas, produtos com maior faturamento e fornecedores.",
    suggestions: [
      "Qual foi meu faturamento este mês?",
      "Compare com o mês passado",
      "Qual loja vendeu mais?",
      "Clientes que mais compram",
    ],
  };
}