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

function normalizeQuestion(question: string) {
  return question.trim().toLowerCase();
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

function getDateRangeForToday() {
  const now = new Date();

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
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

async function getLowStockSummary(
  context: AssistantContext
): Promise<AssistantResponse> {
  if (!context.empresaId) {
    return {
      reply: "Não consegui identificar sua empresa.",
      suggestions: ["Me dê um resumo de hoje"],
    };
  }

  const { data, error } = await supabase
    .from("produtos")
    .select("id, nome, estoque_atual, estoque_minimo, deleted_at")
    .eq("empresa_id", context.empresaId)
    .is("deleted_at", null);

  if (error) {
    return {
      reply: `Tive um problema ao consultar o estoque: ${error.message}`,
      suggestions: ["Me dê um resumo de hoje"],
    };
  }

  const lowStock =
    data?.filter(
      (item) =>
        Number(item.estoque_atual ?? 0) <= Number(item.estoque_minimo ?? 0)
    ) ?? [];

  if (lowStock.length === 0) {
    return {
      reply: "Não encontrei produtos com estoque abaixo do mínimo.",
      suggestions: ["Quem está devendo?", "Me dê um resumo de hoje"],
    };
  }

  const top = lowStock
    .slice(0, 5)
    .map(
      (item) =>
        `${item.nome} (${Number(item.estoque_atual ?? 0)}/${Number(
          item.estoque_minimo ?? 0
        )})`
    )
    .join(", ");

  return {
    reply: `Encontrei ${lowStock.length} produto(s) com estoque baixo. Os mais críticos são: ${top}.`,
    suggestions: [
      "Quem está devendo?",
      "Quais contas estão vencidas?",
      "Me dê um resumo de hoje",
    ],
  };
}

async function getOpenReceivablesSummary(
  context: AssistantContext
): Promise<AssistantResponse> {
  if (!context.empresaId) {
    return {
      reply:
        "Não consegui identificar a empresa ativa para consultar o financeiro.",
      suggestions: ["Me dê um resumo de hoje"],
    };
  }

  const { data, error } = await supabase
    .from("contas_receber")
    .select(
      "id, descricao, valor, status, data_vencimento, cliente_id, deleted_at"
    )
    .eq("empresa_id", context.empresaId)
    .is("deleted_at", null)
    .neq("status", "pago");

  if (error) {
    return {
      reply: `Tive um problema ao consultar contas a receber: ${error.message}`,
      suggestions: ["Me dê um resumo de hoje"],
    };
  }

  const total = (data ?? []).reduce(
    (sum, item) => sum + Number(item.valor ?? 0),
    0
  );

  if (!data || data.length === 0) {
    return {
      reply: "No momento não há contas a receber em aberto.",
      suggestions: ["Quem está devendo?", "Me dê um resumo de hoje"],
    };
  }

  const proximas = [...data]
    .sort((a, b) => {
      const aTime = a.data_vencimento
        ? new Date(a.data_vencimento).getTime()
        : Infinity;
      const bTime = b.data_vencimento
        ? new Date(b.data_vencimento).getTime()
        : Infinity;
      return aTime - bTime;
    })
    .slice(0, 3)
    .map((item) => {
      const venc = item.data_vencimento
        ? new Date(item.data_vencimento).toLocaleDateString("pt-BR")
        : "sem vencimento";

      return `${item.descricao ?? "Sem descrição"} (${formatCurrency(
        Number(item.valor ?? 0)
      )}, venc. ${venc})`;
    })
    .join(", ");

  return {
    reply: `Você tem ${data.length} conta(s) a receber em aberto, somando ${formatCurrency(
      total
    )}. As próximas são: ${proximas}.`,
    suggestions: [
      "Quem está devendo?",
      "Quais contas estão vencidas?",
      "Me dê um resumo de hoje",
    ],
  };
}

async function getDebtorsSummary(
  context: AssistantContext
): Promise<AssistantResponse> {
  if (!context.empresaId) {
    return {
      reply: "Não consegui identificar sua empresa.",
      suggestions: ["Me dê um resumo de hoje"],
    };
  }

  const hoje = getTodayDate();

  const { data, error } = await supabase
    .from("contas_receber")
    .select(`
      id,
      valor,
      status,
      data_vencimento,
      cliente_id,
      deleted_at,
      clientes (
        nome
      )
    `)
    .eq("empresa_id", context.empresaId)
    .is("deleted_at", null)
    .lt("data_vencimento", hoje)
    .neq("status", "pago");

  if (error) {
    return {
      reply: `Tive um problema ao consultar clientes com atraso: ${error.message}`,
      suggestions: ["Quais contas estão vencidas?"],
    };
  }

  if (!data || data.length === 0) {
    return {
      reply: "Nenhum cliente com contas vencidas no momento 🎉",
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
    reply: `Clientes com valores em atraso:\n\n${lista}`,
    suggestions: [
      "Quais contas estão vencidas?",
      "Quanto tenho a receber em aberto?",
      "Me dê um resumo de hoje",
    ],
  };
}

async function getOverdueBillsSummary(
  context: AssistantContext
): Promise<AssistantResponse> {
  if (!context.empresaId) {
    return {
      reply: "Não consegui identificar sua empresa.",
      suggestions: ["Quem está devendo?"],
    };
  }

  const hoje = getTodayDate();

  const { data, error } = await supabase
    .from("contas_receber")
    .select(`
      id,
      descricao,
      valor,
      status,
      data_vencimento,
      deleted_at,
      clientes (
        nome
      )
    `)
    .eq("empresa_id", context.empresaId)
    .is("deleted_at", null)
    .lt("data_vencimento", hoje)
    .neq("status", "pago")
    .order("data_vencimento", { ascending: true });

  if (error) {
    return {
      reply: `Tive um problema ao consultar contas vencidas: ${error.message}`,
      suggestions: ["Quem está devendo?"],
    };
  }

  if (!data || data.length === 0) {
    return {
      reply: "Não encontrei contas vencidas no momento.",
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
    reply: `Encontrei ${data.length} conta(s) vencida(s):\n\n${lista}`,
    suggestions: [
      "Quem está devendo?",
      "Quanto tenho a receber em aberto?",
      "Me dê um resumo de hoje",
    ],
  };
}

async function getTodaySummary(
  context: AssistantContext
): Promise<AssistantResponse> {
  if (!context.empresaId) {
    return {
      reply: "Não consegui identificar a empresa ativa para montar o resumo.",
      suggestions: ["Como está meu estoque baixo?"],
    };
  }

  const { start, end } = getDateRangeForToday();

  const vendasQuery = supabase
    .from("pedidos_venda")
    .select("id, total, created_at, deleted_at")
    .eq("empresa_id", context.empresaId)
    .is("deleted_at", null)
    .gte("created_at", start)
    .lte("created_at", end);

  const receberQuery = supabase
    .from("contas_receber")
    .select("id, valor, status, deleted_at")
    .eq("empresa_id", context.empresaId)
    .is("deleted_at", null)
    .neq("status", "pago");

  const estoqueQuery = supabase
    .from("produtos")
    .select("id, estoque_atual, estoque_minimo, deleted_at")
    .eq("empresa_id", context.empresaId)
    .is("deleted_at", null);

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
    (sum, item) => sum + Number(item.total ?? 0),
    0
  );

  const totalReceber = contas.reduce(
    (sum, item) => sum + Number(item.valor ?? 0),
    0
  );

  const estoqueBaixo = produtos.filter(
    (item) =>
      Number(item.estoque_atual ?? 0) <= Number(item.estoque_minimo ?? 0)
  ).length;

  return {
    reply: `Resumo de hoje: ${vendas.length} pedido(s) de venda, faturamento de ${formatCurrency(
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
  context: AssistantContext
): Promise<AssistantResponse> {
  if (!context.empresaId) {
    return {
      reply: "Não consegui identificar sua empresa.",
      suggestions: ["Me dê um resumo de hoje"],
    };
  }

  const { start, end } = getDateRangeForToday();

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

  if (context.lojaId) {
    query = query.eq("loja_id", context.lojaId);
  }

  const { data, error } = await query;

  if (error) {
    return {
      reply: `Tive um problema ao consultar as movimentações: ${error.message}`,
      suggestions: ["Me dê um resumo de hoje"],
    };
  }

  if (!data || data.length === 0) {
    return {
      reply: "Não encontrei saídas de estoque hoje.",
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
    reply: `Produtos com mais saídas hoje:\n\n${top
      .map((item) => `• ${item.nome}: ${item.qty}`)
      .join("\n")}`,
    suggestions: [
      "Como está meu estoque baixo?",
      "Quem está devendo?",
      "Me dê um resumo de hoje",
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
    q.includes("devendo") ||
    q.includes("inadimplente") ||
    q.includes("quem deve") ||
    q.includes("quem está devendo") ||
    q.includes("clientes devendo")
  ) {
    return getDebtorsSummary(safeContext);
  }

  if (
    q.includes("contas vencidas") ||
    q.includes("vencidas") ||
    q.includes("vencidos") ||
    q.includes("atrasadas")
  ) {
    return getOverdueBillsSummary(safeContext);
  }

  if (q.includes("estoque")) {
    return getLowStockSummary(safeContext);
  }

  if (
    q.includes("receber") ||
    q.includes("financeiro") ||
    q.includes("cobran") ||
    q.includes("aberto")
  ) {
    return getOpenReceivablesSummary(safeContext);
  }

  if (q.includes("resumo") || q.includes("hoje")) {
    return getTodaySummary(safeContext);
  }

  if (
    q.includes("saídas") ||
    q.includes("saidas") ||
    q.includes("mais vendidos") ||
    q.includes("movimenta")
  ) {
    return getTopProductsSummary(safeContext);
  }

  return {
    reply:
      "Já consigo responder sobre estoque baixo, clientes devendo, contas vencidas, contas a receber, resumo do dia e produtos com mais saídas.",
    suggestions: [
      "Quem está devendo?",
      "Quais contas estão vencidas?",
      "Me dê um resumo de hoje",
    ],
  };
}