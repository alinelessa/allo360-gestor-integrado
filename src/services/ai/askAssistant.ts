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
  if (!context.empresaId || !context.lojaId) {
    return {
      reply:
        "Não consegui identificar a empresa ou a loja ativa. Selecione uma loja para eu analisar o estoque.",
      suggestions: [
        "Me dê um resumo de hoje",
        "Quanto tenho a receber em aberto?",
      ],
    };
  }

  const { data, error } = await supabase
    .from("produtos")
    .select("id, nome, estoque_atual, estoque_minimo")
    .eq("empresa_id", context.empresaId)
    .eq("loja_id", context.lojaId);

  if (error) {
    return {
      reply: `Tive um problema ao consultar o estoque: ${error.message}`,
      suggestions: ["Me dê um resumo de hoje"],
    };
  }

  const lowStock =
    data?.filter(
      (item) => Number(item.estoque_atual ?? 0) <= Number(item.estoque_minimo ?? 0)
    ) ?? [];

  if (lowStock.length === 0) {
    return {
      reply: `Na loja ${
        context.lojaNome ?? "ativa"
      }, não encontrei produtos com estoque abaixo do mínimo no momento.`,
      suggestions: [
        "Me dê um resumo de hoje",
        "Quanto tenho a receber em aberto?",
      ],
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
    reply: `Encontrei ${lowStock.length} produto(s) com estoque baixo na loja ${
      context.lojaNome ?? "ativa"
    }. Os mais críticos são: ${top}.`,
    suggestions: [
      "Me dê um resumo de hoje",
      "Quanto tenho a receber em aberto?",
      "Quais produtos tiveram mais saídas?",
    ],
  };
}

async function getOpenReceivablesSummary(
  context: AssistantContext
): Promise<AssistantResponse> {
  if (!context.empresaId) {
    return {
      reply: "Não consegui identificar a empresa ativa para consultar o financeiro.",
      suggestions: ["Me dê um resumo de hoje"],
    };
  }

  let query = supabase
    .from("contas_receber")
    .select("id, descricao, valor, status, vencimento, loja_id")
    .eq("empresa_id", context.empresaId)
    .eq("status", "pendente");

  if (context.lojaId) {
    query = query.eq("loja_id", context.lojaId);
  }

  const { data, error } = await query;

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
      reply: `No momento não há contas a receber pendentes${
        context.lojaNome ? ` na loja ${context.lojaNome}` : ""
      }.`,
      suggestions: ["Me dê um resumo de hoje", "Como está meu estoque baixo?"],
    };
  }

  const proximas = [...data]
    .sort((a, b) => {
      const aTime = a.vencimento ? new Date(a.vencimento).getTime() : Infinity;
      const bTime = b.vencimento ? new Date(b.vencimento).getTime() : Infinity;
      return aTime - bTime;
    })
    .slice(0, 3)
    .map((item) => {
      const venc = item.vencimento
        ? new Date(item.vencimento).toLocaleDateString("pt-BR")
        : "sem vencimento";

      return `${item.descricao ?? "Sem descrição"} (${formatCurrency(
        Number(item.valor ?? 0)
      )}, venc. ${venc})`;
    })
    .join(", ");

  return {
    reply: `Você tem ${data.length} conta(s) a receber em aberto${
      context.lojaNome ? ` na loja ${context.lojaNome}` : ""
    }, somando ${formatCurrency(total)}. As próximas são: ${proximas}.`,
    suggestions: [
      "Me dê um resumo de hoje",
      "Como está meu estoque baixo?",
      "Quais produtos tiveram mais saídas?",
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

  let vendasQuery = supabase
    .from("pedidos_venda")
    .select("id, valor_total, created_at, loja_id")
    .eq("empresa_id", context.empresaId)
    .gte("created_at", start)
    .lte("created_at", end);

  let receberQuery = supabase
    .from("contas_receber")
    .select("id, valor, status, loja_id")
    .eq("empresa_id", context.empresaId)
    .eq("status", "pendente");

  let estoqueQuery = supabase
    .from("produtos")
    .select("id, estoque_atual, estoque_minimo, loja_id")
    .eq("empresa_id", context.empresaId);

  if (context.lojaId) {
    vendasQuery = vendasQuery.eq("loja_id", context.lojaId);
    receberQuery = receberQuery.eq("loja_id", context.lojaId);
    estoqueQuery = estoqueQuery.eq("loja_id", context.lojaId);
  }

  const [vendasRes, receberRes, estoqueRes] = await Promise.all([
    vendasQuery,
    receberQuery,
    estoqueQuery,
  ]);

  if (vendasRes.error || receberRes.error || estoqueRes.error) {
    return {
      reply:
        "Tive um problema para montar o resumo de hoje. Confira se as tabelas financeiras e de pedidos estão acessíveis.",
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
    (sum, item) => sum + Number(item.valor_total ?? 0),
    0
  );

  const totalReceber = contas.reduce(
    (sum, item) => sum + Number(item.valor ?? 0),
    0
  );

  const estoqueBaixo = produtos.filter(
    (item) => Number(item.estoque_atual ?? 0) <= Number(item.estoque_minimo ?? 0)
  ).length;

  return {
    reply: `Resumo de hoje${
      context.lojaNome ? ` na loja ${context.lojaNome}` : ""
    }: ${vendas.length} pedido(s) de venda registrados, faturamento de ${formatCurrency(
      faturamentoHoje
    )}, ${contas.length} conta(s) a receber pendentes somando ${formatCurrency(
      totalReceber
    )} e ${estoqueBaixo} produto(s) com estoque crítico.`,
    suggestions: [
      "Como está meu estoque baixo?",
      "Quanto tenho a receber em aberto?",
      "Quais produtos tiveram mais saídas?",
    ],
  };
}

async function getTopProductsSummary(
  context: AssistantContext
): Promise<AssistantResponse> {
  if (!context.empresaId) {
    return {
      reply:
        "Não consegui identificar a empresa ativa para consultar as movimentações.",
      suggestions: ["Me dê um resumo de hoje"],
    };
  }

  const { start, end } = getDateRangeForToday();

  let query = supabase
    .from("movimentacoes_estoque")
    .select("produto_id, quantidade, tipo, produtos(nome), loja_id, created_at")
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
      reply: `Não encontrei saídas de estoque hoje${
        context.lojaNome ? ` na loja ${context.lojaNome}` : ""
      }.`,
      suggestions: ["Me dê um resumo de hoje", "Como está meu estoque baixo?"],
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
    reply: `Os produtos com mais saídas hoje${
      context.lojaNome ? ` na loja ${context.lojaNome}` : ""
    } são: ${top.map((item) => `${item.nome} (${item.qty})`).join(", ")}.`,
    suggestions: [
      "Como está meu estoque baixo?",
      "Me dê um resumo de hoje",
      "Quanto tenho a receber em aberto?",
    ],
  };
}

export async function askAssistant(
  question: string,
  context?: AssistantContext
): Promise<AssistantResponse> {
  const q = normalizeQuestion(question);
  const safeContext = context ?? getFallbackContext();

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
      "Já consigo consultar estoque baixo, contas a receber, resumo do dia e produtos com mais saídas. Me faça uma pergunta dentro desses temas.",
    suggestions: [
      "Como está meu estoque baixo?",
      "Quanto tenho a receber em aberto?",
      "Me dê um resumo de hoje",
    ],
  };
}