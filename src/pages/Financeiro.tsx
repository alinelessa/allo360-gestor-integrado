import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Upload, Loader2 } from "lucide-react";

interface ContaPagar {
  id: string;
  fornecedor_id: string | null;
  descricao: string;
  valor: number;
  data_vencimento: string;
  status: string;
  nota_fiscal: string | null;
}

interface ContaReceber {
  id: string;
  cliente_id: string | null;
  descricao: string;
  valor: number;
  data_vencimento: string;
  status: string;
  nota_fiscal: string | null;
}

const statusColor: Record<string, string> = {
  pendente: "secondary",
  pago: "default",
  vencido: "destructive",
};

const Financeiro = () => {
  const { empresaIdAtiva, lojaAtiva } = useAuth();
  const { toast } = useToast();

  const [pagar, setPagar] = useState<ContaPagar[]>([]);
  const [receber, setReceber] = useState<ContaReceber[]>([]);
  const [fornecedores, setFornecedores] = useState<
    { id: string; nome: string }[]
  >([]);
  const [clientes, setClientes] = useState<{ id: string; nome: string }[]>([]);

  const [openPagar, setOpenPagar] = useState(false);
  const [openReceber, setOpenReceber] = useState(false);
  const [editPagar, setEditPagar] = useState<ContaPagar | null>(null);
  const [editReceber, setEditReceber] = useState<ContaReceber | null>(null);

  const [formPagar, setFormPagar] = useState({
    fornecedor_id: "",
    descricao: "",
    valor: "",
    data_vencimento: "",
    status: "pendente",
    nota_fiscal: "",
  });

  const [formReceber, setFormReceber] = useState({
    cliente_id: "",
    descricao: "",
    valor: "",
    data_vencimento: "",
    status: "pendente",
    nota_fiscal: "",
  });

  const [openNfUpload, setOpenNfUpload] = useState(false);
  const [nfText, setNfText] = useState("");
  const [nfParsing, setNfParsing] = useState(false);
  const [nfResult, setNfResult] = useState<any>(null);

  const resetPagar = () => {
    setEditPagar(null);
    setFormPagar({
      fornecedor_id: "",
      descricao: "",
      valor: "",
      data_vencimento: "",
      status: "pendente",
      nota_fiscal: "",
    });
  };

  const resetReceber = () => {
    setEditReceber(null);
    setFormReceber({
      cliente_id: "",
      descricao: "",
      valor: "",
      data_vencimento: "",
      status: "pendente",
      nota_fiscal: "",
    });
  };

  const fetchData = async () => {
    if (!empresaIdAtiva) return;

    let pagarQuery = supabase
      .from("contas_pagar")
      .select("*")
      .eq("empresa_id", empresaIdAtiva)
      .order("data_vencimento");

    let receberQuery = supabase
      .from("contas_receber")
      .select("*")
      .eq("empresa_id", empresaIdAtiva)
      .order("data_vencimento");

    let fornecedoresQuery = supabase
      .from("fornecedores")
      .select("id, nome")
      .eq("empresa_id", empresaIdAtiva);

    let clientesQuery = supabase
      .from("clientes")
      .select("id, nome")
      .eq("empresa_id", empresaIdAtiva);

    if (lojaAtiva?.id) {
      pagarQuery = pagarQuery.eq("loja_id", lojaAtiva.id);
      receberQuery = receberQuery.eq("loja_id", lojaAtiva.id);
      fornecedoresQuery = fornecedoresQuery.eq("loja_id", lojaAtiva.id);
      clientesQuery = clientesQuery.eq("loja_id", lojaAtiva.id);
    }

    const [p, r, f, c] = await Promise.all([
      pagarQuery,
      receberQuery,
      fornecedoresQuery,
      clientesQuery,
    ]);

    if (p.data) setPagar(p.data as ContaPagar[]);
    if (r.data) setReceber(r.data as ContaReceber[]);
    if (f.data) setFornecedores(f.data);
    if (c.data) setClientes(c.data);
  };

  useEffect(() => {
    fetchData();
  }, [empresaIdAtiva, lojaAtiva?.id]);

  const savePagar = async () => {
    if (!empresaIdAtiva) {
      toast({
        title: "Empresa não identificada",
        variant: "destructive",
      });
      return;
    }

    if (!lojaAtiva?.id) {
      toast({
        title: "Loja não selecionada",
        description: "Selecione uma loja ativa antes de cadastrar a conta.",
        variant: "destructive",
      });
      return;
    }

    const data = {
      empresa_id: empresaIdAtiva,
      loja_id: lojaAtiva.id,
      fornecedor_id: formPagar.fornecedor_id || null,
      descricao: formPagar.descricao,
      valor: Number(formPagar.valor),
      data_vencimento: formPagar.data_vencimento,
      status: formPagar.status,
      nota_fiscal: formPagar.nota_fiscal || null,
    };

    if (editPagar) {
      const { error } = await supabase
        .from("contas_pagar")
        .update(data)
        .eq("id", editPagar.id);

      if (error) {
        toast({
          title: "Erro ao atualizar conta",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Conta atualizada!" });
    } else {
      const { error } = await supabase.from("contas_pagar").insert(data);

      if (error) {
        toast({
          title: "Erro ao cadastrar conta",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Conta cadastrada!" });
    }

    setOpenPagar(false);
    resetPagar();
    fetchData();
  };

  const saveReceber = async () => {
    if (!empresaIdAtiva) {
      toast({
        title: "Empresa não identificada",
        variant: "destructive",
      });
      return;
    }

    if (!lojaAtiva?.id) {
      toast({
        title: "Loja não selecionada",
        description: "Selecione uma loja ativa antes de cadastrar a conta.",
        variant: "destructive",
      });
      return;
    }

    const data = {
      empresa_id: empresaIdAtiva,
      loja_id: lojaAtiva.id,
      cliente_id: formReceber.cliente_id || null,
      descricao: formReceber.descricao,
      valor: Number(formReceber.valor),
      data_vencimento: formReceber.data_vencimento,
      status: formReceber.status,
      nota_fiscal: formReceber.nota_fiscal || null,
    };

    if (editReceber) {
      const { error } = await supabase
        .from("contas_receber")
        .update(data)
        .eq("id", editReceber.id);

      if (error) {
        toast({
          title: "Erro ao atualizar conta",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Conta atualizada!" });
    } else {
      const { error } = await supabase.from("contas_receber").insert(data);

      if (error) {
        toast({
          title: "Erro ao cadastrar conta",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Conta cadastrada!" });
    }

    setOpenReceber(false);
    resetReceber();
    fetchData();
  };

  const handleNfParse = async () => {
    if (!nfText.trim()) {
      toast({
        title: "Cole o conteúdo da nota fiscal",
        variant: "destructive",
      });
      return;
    }

    setNfParsing(true);
    setNfResult(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-nota-fiscal`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ text_content: nfText }),
        }
      );

      const result = await res.json();

      if (result.error) throw new Error(result.error);

      setNfResult(result.data);
      toast({ title: "Nota fiscal interpretada com sucesso!" });
    } catch (err: any) {
      toast({
        title: "Erro ao processar NF",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setNfParsing(false);
    }
  };

  const handleNfImport = async () => {
    if (!nfResult || !empresaIdAtiva) return;

    if (!lojaAtiva?.id) {
      toast({
        title: "Loja não selecionada",
        description: "Selecione uma loja ativa antes de importar a nota fiscal.",
        variant: "destructive",
      });
      return;
    }

    try {
      let fornecedorId: string | null = null;

      if (nfResult.fornecedor?.nome) {
        const { data: existing } = await supabase
          .from("fornecedores")
          .select("id")
          .eq("empresa_id", empresaIdAtiva)
          .eq("nome", nfResult.fornecedor.nome)
          .maybeSingle();

        if (existing) {
          fornecedorId = existing.id;
        } else {
          const { data: newF, error: fornecedorError } = await supabase
            .from("fornecedores")
            .insert({
              empresa_id: empresaIdAtiva,
              loja_id: lojaAtiva.id,
              nome: nfResult.fornecedor.nome,
              cnpj: nfResult.fornecedor.cnpj || null,
              telefone: nfResult.fornecedor.telefone || null,
              email: nfResult.fornecedor.email || null,
              endereco: nfResult.fornecedor.endereco || null,
            })
            .select("id")
            .single();

          if (fornecedorError) throw fornecedorError;
          if (newF) fornecedorId = newF.id;
        }
      }

      let clienteId: string | null = null;

      if (nfResult.cliente?.nome) {
        const { data: existing } = await supabase
          .from("clientes")
          .select("id")
          .eq("empresa_id", empresaIdAtiva)
          .eq("nome", nfResult.cliente.nome)
          .maybeSingle();

        if (existing) {
          clienteId = existing.id;
        } else {
          const { data: newC, error: clienteError } = await supabase
            .from("clientes")
            .insert({
              empresa_id: empresaIdAtiva,
              loja_id: lojaAtiva.id,
              nome: nfResult.cliente.nome,
              cpf_cnpj: nfResult.cliente.cnpj || null,
              telefone: nfResult.cliente.telefone || null,
              email: nfResult.cliente.email || null,
              endereco: nfResult.cliente.endereco || null,
            })
            .select("id")
            .single();

          if (clienteError) throw clienteError;
          if (newC) clienteId = newC.id;
        }
      }

      if (nfResult.tipo === "pagar") {
        const { error } = await supabase.from("contas_pagar").insert({
          empresa_id: empresaIdAtiva,
          loja_id: lojaAtiva.id,
          fornecedor_id: fornecedorId,
          descricao: nfResult.descricao || "NF Importada",
          valor: nfResult.valor || 0,
          data_vencimento:
            nfResult.data_vencimento || new Date().toISOString().split("T")[0],
          status: "pendente",
          nota_fiscal: nfResult.nota_fiscal || null,
        });

        if (error) throw error;
      } else {
        const { error } = await supabase.from("contas_receber").insert({
          empresa_id: empresaIdAtiva,
          loja_id: lojaAtiva.id,
          cliente_id: clienteId,
          descricao: nfResult.descricao || "NF Importada",
          valor: nfResult.valor || 0,
          data_vencimento:
            nfResult.data_vencimento || new Date().toISOString().split("T")[0],
          status: "pendente",
          nota_fiscal: nfResult.nota_fiscal || null,
        });

        if (error) throw error;
      }

      if (nfResult.produtos?.length) {
        for (const prod of nfResult.produtos) {
          if (!prod.nome) continue;

          const { data: existing } = await supabase
            .from("produtos")
            .select("id")
            .eq("empresa_id", empresaIdAtiva)
            .eq("nome", prod.nome)
            .maybeSingle();

          if (!existing) {
            const { error } = await supabase.from("produtos").insert({
              empresa_id: empresaIdAtiva,
              loja_id: lojaAtiva.id,
              nome: prod.nome,
              codigo: prod.codigo || null,
              preco: prod.preco_unitario || 0,
              custo: prod.preco_unitario || 0,
              categoria: prod.categoria || null,
              fornecedor_id: fornecedorId,
            });

            if (error) throw error;
          }
        }
      }

      toast({ title: "Dados da NF importados com sucesso!" });
      setOpenNfUpload(false);
      setNfText("");
      setNfResult(null);
      fetchData();
    } catch (err: any) {
      toast({
        title: "Erro ao importar",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const totalPagarPendente = pagar
    .filter((p) => p.status === "pendente")
    .reduce((s, p) => s + Number(p.valor), 0);

  const totalReceberPendente = receber
    .filter((r) => r.status === "pendente")
    .reduce((s, r) => s + Number(r.valor), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Financeiro</h1>
          <p className="text-sm text-muted-foreground">
            Contas a pagar e receber
            {lojaAtiva?.nome ? ` da ${lojaAtiva.nome}` : ""}
          </p>
        </div>

        <Dialog
          open={openNfUpload}
          onOpenChange={(v) => {
            setOpenNfUpload(v);
            if (!v) {
              setNfText("");
              setNfResult(null);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button variant="outline" disabled={!lojaAtiva?.id}>
              <Upload className="mr-2 h-4 w-4" />
              Importar NF
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Importar Nota Fiscal</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {!lojaAtiva?.id && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  Selecione uma loja ativa antes de importar a nota fiscal.
                </div>
              )}

              <div>
                <Label>Cole o conteúdo da nota fiscal (texto)</Label>
                <Textarea
                  rows={8}
                  placeholder="Cole aqui o texto completo da nota fiscal..."
                  value={nfText}
                  onChange={(e) => setNfText(e.target.value)}
                />
              </div>

              <Button
                onClick={handleNfParse}
                disabled={nfParsing}
                className="w-full"
              >
                {nfParsing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando com IA...
                  </>
                ) : (
                  "Interpretar Nota Fiscal"
                )}
              </Button>

              {nfResult && (
                <Card className="bg-muted/50">
                  <CardContent className="space-y-2 p-4">
                    <p className="text-sm font-semibold">Dados extraídos:</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Tipo:</span>{" "}
                        {nfResult.tipo === "pagar"
                          ? "Conta a Pagar"
                          : "Conta a Receber"}
                      </div>
                      <div>
                        <span className="text-muted-foreground">NF:</span>{" "}
                        {nfResult.nota_fiscal || "—"}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Descrição:</span>{" "}
                        {nfResult.descricao || "—"}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Valor:</span> R${" "}
                        {nfResult.valor?.toFixed(2) || "0.00"}
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          Vencimento:
                        </span>{" "}
                        {nfResult.data_vencimento || "—"}
                      </div>
                      {nfResult.fornecedor?.nome && (
                        <div>
                          <span className="text-muted-foreground">
                            Fornecedor:
                          </span>{" "}
                          {nfResult.fornecedor.nome}
                        </div>
                      )}
                      {nfResult.cliente?.nome && (
                        <div>
                          <span className="text-muted-foreground">Cliente:</span>{" "}
                          {nfResult.cliente.nome}
                        </div>
                      )}
                    </div>

                    {nfResult.produtos?.length > 0 && (
                      <div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Produtos:{" "}
                          {nfResult.produtos
                            .map((p: any) => p.nome)
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      </div>
                    )}

                    <Button onClick={handleNfImport} className="mt-3 w-full">
                      Confirmar e Importar
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              A Pagar (pendente)
            </p>
            <p className="mt-1 text-xl font-bold text-destructive">
              R$ {totalPagarPendente.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              A Receber (pendente)
            </p>
            <p className="mt-1 text-xl font-bold text-primary">
              R$ {totalReceberPendente.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Saldo Projetado
            </p>
            <p
              className={`mt-1 text-xl font-bold ${
                totalReceberPendente - totalPagarPendente >= 0
                  ? "text-success"
                  : "text-destructive"
              }`}
            >
              R$ {(totalReceberPendente - totalPagarPendente).toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pagar">
        <TabsList>
          <TabsTrigger value="pagar">Contas a Pagar</TabsTrigger>
          <TabsTrigger value="receber">Contas a Receber</TabsTrigger>
        </TabsList>

        <TabsContent value="pagar">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between py-4">
              <CardTitle className="text-base">Contas a Pagar</CardTitle>

              <Dialog
                open={openPagar}
                onOpenChange={(v) => {
                  setOpenPagar(v);
                  if (!v) resetPagar();
                }}
              >
                <DialogTrigger asChild>
                  <Button size="sm" disabled={!lojaAtiva?.id}>
                    <Plus className="mr-1 h-4 w-4" /> Nova
                  </Button>
                </DialogTrigger>

                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editPagar ? "Editar" : "Nova Conta a Pagar"}
                    </DialogTitle>
                  </DialogHeader>

                  <div className="space-y-3">
                    {!lojaAtiva?.id && (
                      <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                        Selecione uma loja ativa antes de cadastrar a conta.
                      </div>
                    )}

                    <div>
                      <Label>Descrição</Label>
                      <Input
                        value={formPagar.descricao}
                        onChange={(e) =>
                          setFormPagar({
                            ...formPagar,
                            descricao: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div>
                      <Label>Nota Fiscal (opcional)</Label>
                      <Input
                        placeholder="Nº da NF"
                        value={formPagar.nota_fiscal}
                        onChange={(e) =>
                          setFormPagar({
                            ...formPagar,
                            nota_fiscal: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Valor (R$)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={formPagar.valor}
                          onChange={(e) =>
                            setFormPagar({
                              ...formPagar,
                              valor: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div>
                        <Label>Vencimento</Label>
                        <Input
                          type="date"
                          value={formPagar.data_vencimento}
                          onChange={(e) =>
                            setFormPagar({
                              ...formPagar,
                              data_vencimento: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Fornecedor</Label>
                        <Select
                          value={formPagar.fornecedor_id}
                          onValueChange={(v) =>
                            setFormPagar({ ...formPagar, fornecedor_id: v })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {fornecedores.map((f) => (
                              <SelectItem key={f.id} value={f.id}>
                                {f.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Status</Label>
                        <Select
                          value={formPagar.status}
                          onValueChange={(v) =>
                            setFormPagar({ ...formPagar, status: v })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pendente">Pendente</SelectItem>
                            <SelectItem value="pago">Pago</SelectItem>
                            <SelectItem value="vencido">Vencido</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Button
                      onClick={savePagar}
                      className="w-full"
                      disabled={!lojaAtiva?.id}
                    >
                      {editPagar ? "Salvar" : "Cadastrar"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>

            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead>NF</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {pagar.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">
                        {p.descricao}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {p.nota_fiscal || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        R$ {Number(p.valor).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {new Date(p.data_vencimento).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusColor[p.status] as any}>
                          {p.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditPagar(p);
                              setFormPagar({
                                fornecedor_id: p.fornecedor_id || "",
                                descricao: p.descricao,
                                valor: String(p.valor),
                                data_vencimento: p.data_vencimento,
                                status: p.status,
                                nota_fiscal: p.nota_fiscal || "",
                              });
                              setOpenPagar(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={async () => {
                              const { error } = await supabase
                                .from("contas_pagar")
                                .delete()
                                .eq("id", p.id);

                              if (error) {
                                toast({
                                  title: "Erro ao excluir conta",
                                  description: error.message,
                                  variant: "destructive",
                                });
                                return;
                              }

                              fetchData();
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}

                  {pagar.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="py-8 text-center text-muted-foreground"
                      >
                        Nenhuma conta
                        {lojaAtiva?.nome ? ` na ${lojaAtiva.nome}` : ""}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receber">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between py-4">
              <CardTitle className="text-base">Contas a Receber</CardTitle>

              <Dialog
                open={openReceber}
                onOpenChange={(v) => {
                  setOpenReceber(v);
                  if (!v) resetReceber();
                }}
              >
                <DialogTrigger asChild>
                  <Button size="sm" disabled={!lojaAtiva?.id}>
                    <Plus className="mr-1 h-4 w-4" /> Nova
                  </Button>
                </DialogTrigger>

                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editReceber ? "Editar" : "Nova Conta a Receber"}
                    </DialogTitle>
                  </DialogHeader>

                  <div className="space-y-3">
                    {!lojaAtiva?.id && (
                      <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                        Selecione uma loja ativa antes de cadastrar a conta.
                      </div>
                    )}

                    <div>
                      <Label>Descrição</Label>
                      <Input
                        value={formReceber.descricao}
                        onChange={(e) =>
                          setFormReceber({
                            ...formReceber,
                            descricao: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div>
                      <Label>Nota Fiscal (opcional)</Label>
                      <Input
                        placeholder="Nº da NF"
                        value={formReceber.nota_fiscal}
                        onChange={(e) =>
                          setFormReceber({
                            ...formReceber,
                            nota_fiscal: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Valor (R$)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={formReceber.valor}
                          onChange={(e) =>
                            setFormReceber({
                              ...formReceber,
                              valor: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div>
                        <Label>Vencimento</Label>
                        <Input
                          type="date"
                          value={formReceber.data_vencimento}
                          onChange={(e) =>
                            setFormReceber({
                              ...formReceber,
                              data_vencimento: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Cliente</Label>
                        <Select
                          value={formReceber.cliente_id}
                          onValueChange={(v) =>
                            setFormReceber({ ...formReceber, cliente_id: v })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {clientes.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Status</Label>
                        <Select
                          value={formReceber.status}
                          onValueChange={(v) =>
                            setFormReceber({ ...formReceber, status: v })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pendente">Pendente</SelectItem>
                            <SelectItem value="pago">Pago</SelectItem>
                            <SelectItem value="vencido">Vencido</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Button
                      onClick={saveReceber}
                      className="w-full"
                      disabled={!lojaAtiva?.id}
                    >
                      {editReceber ? "Salvar" : "Cadastrar"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>

            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead>NF</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {receber.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">
                        {r.descricao}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {r.nota_fiscal || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        R$ {Number(r.valor).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {new Date(r.data_vencimento).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusColor[r.status] as any}>
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditReceber(r);
                              setFormReceber({
                                cliente_id: r.cliente_id || "",
                                descricao: r.descricao,
                                valor: String(r.valor),
                                data_vencimento: r.data_vencimento,
                                status: r.status,
                                nota_fiscal: r.nota_fiscal || "",
                              });
                              setOpenReceber(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={async () => {
                              const { error } = await supabase
                                .from("contas_receber")
                                .delete()
                                .eq("id", r.id);

                              if (error) {
                                toast({
                                  title: "Erro ao excluir conta",
                                  description: error.message,
                                  variant: "destructive",
                                });
                                return;
                              }

                              fetchData();
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}

                  {receber.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="py-8 text-center text-muted-foreground"
                      >
                        Nenhuma conta
                        {lojaAtiva?.nome ? ` na ${lojaAtiva.nome}` : ""}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Financeiro;