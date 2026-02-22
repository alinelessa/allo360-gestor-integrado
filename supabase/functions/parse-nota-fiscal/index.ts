import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Não autorizado");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("Não autorizado");

    const { text_content } = await req.json();
    if (!text_content) throw new Error("Conteúdo da nota fiscal é obrigatório");

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("API key não configurada");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `Você é um parser de notas fiscais brasileiras. Extraia os seguintes dados em JSON:
{
  "tipo": "pagar" ou "receber",
  "nota_fiscal": "número da NF",
  "descricao": "descrição do produto/serviço",
  "valor": número decimal,
  "data_vencimento": "YYYY-MM-DD",
  "fornecedor": { "nome": "", "cnpj": "", "telefone": "", "email": "", "endereco": "" },
  "cliente": { "nome": "", "cnpj": "", "telefone": "", "email": "", "endereco": "" },
  "produtos": [{ "nome": "", "codigo": "", "quantidade": número, "preco_unitario": número, "categoria": "" }]
}
Se não encontrar algum campo, retorne null. Retorne APENAS o JSON, sem markdown.`
          },
          { role: "user", content: text_content }
        ],
        temperature: 0.1,
      }),
    });

    if (!aiResponse.ok) {
      const errBody = await aiResponse.text();
      throw new Error(`Erro na IA: ${errBody}`);
    }

    const aiData = await aiResponse.json();
    let parsed;
    try {
      let content = aiData.choices[0].message.content.trim();
      content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "");
      parsed = JSON.parse(content);
    } catch {
      throw new Error("Não foi possível interpretar a nota fiscal");
    }

    return new Response(JSON.stringify({ success: true, data: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
