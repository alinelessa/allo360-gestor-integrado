import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, AlertTriangle, ArrowDownCircle, Search, Pencil, Trash2 } from "lucide-react";

interface Produto {
  id: string;
  nome: string;
  codigo: string | null;
  sku: string;
  ean: string | null;
  codigo_barras: string | null;
  unidade_medida: string;
  categoria: string | null;
  fornecedor_id: string | null;
  custo: number;
  preco: number;
  estoque_atual: number;
  estoque_minimo: number;
  loja_id?: string | null;
}

interface Fornecedor {
  id: string;
  nome: string;
}

const UNIDADES_MEDIDA = [
  { value: "UN", label: "Unidade" },
  { value: "CX", label: "Caixa" },
  { value: "PC", label: "Peça" },
  { value: "KG", label: "Kg" },
  { value: "G", label: "Grama" },
  { value: "LT", label: "Litro" },
  { value: "ML", label: "Mililitro" },
  { value: "MT", label: "Metro" },
  { value: "M2", label: "Metro²" },
  { value: "M3", label: "Metro³" },
];

const Estoque = () => {
  const { profile, lojaAtiva } = useAuth();
  const { toast } = useToast();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [openProduto, setOpenProduto] = useState(false);
  const [openMov, setOpenMov] = useState(false);
  const [editingProduto, setEditingProduto] = useState<Produto | null>(null);
  const [form, setForm] = useState({
    nome: "",
    codigo: "",
    sku: "",
    ean: "",
    codigo_barras: "",
    unidade_medida: "UN",
    categoria: "",
    fornecedor_id: "",
    custo: "",
    preco: "",
    estoque_atual: "",
    estoque_minimo: "",
  });
  const [movForm, setMovForm] = useState({
    produto_id: "",
    tipo: "entrada",
    quantidade: "",
    observacao: "",
  });

  const empresaId = profile?.empresa_id;
  const lojaId = lojaAtiva?.id;

  const resetProdutoForm = () => {
    setEditingProduto(null);
    setForm({
      nome: "",
      codigo: "",
      sku: "",
      ean: "",
      codigo_barras: "",
      unidade_medida: "UN",
      categoria: "",
      fornecedor_id: "",
      custo: "",
      preco: "",
      estoque_atual: "",
      estoque_minimo: "",
    });
  };

  const fetchData = async () => {
    if (!empresaId || !lojaId) return;

    const [p, f] = await Promise.all([
      supabase
        .from("produtos")
        .select("*")
        .eq("empresa_id", empresaId)
        .eq("loja_id", lojaId)
        .is("deleted_at", null)
        .order("nome"),
      supabase
        .from("fornecedores")
        .select("id, nome")
        .eq("empresa_id", empresaId)
        .eq("loja_id", lojaId)
        .is("deleted_at", null)
        .order("nome"),
    ]);

    if (p.data) setProdutos(p.data as Produto[]);
    if (f.data) setFornecedores(f.data as Fornecedor[]);
  };

  useEffect(() => {
    fetchData();
  }, [empresaId, lojaId]);

  const handleSaveProduto = async () => {
    if (!empresaId) {
      toast({
        title: "Empresa não encontrada",
        description: "O usuário logado não possui empresa_id no perfil.",
        variant: "destructive",
      });
      return;
    }

    if (!lojaId) {
      toast({
        title: "Loja não selecionada",
        description: "Selecione uma loja antes de cadastrar.",
        variant: "destructive",
      });
      return;
    }

    if (!form.nome.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Informe o nome do produto.",
        variant: "destructive",
      });
      return;
    }

    if (!form.sku.trim()) {
      toast({
        title: "SKU obrigatório",
        description: "Informe o SKU do produto.",
        variant: "destructive",
      });
      return;
    }

    const data = {
      empresa_id: empresaId,
      loja_id: lojaId,
      nome: form.nome.trim(),
      codigo: form.codigo.trim() || null,
      sku: form.sku.trim(),
      ean: form.ean.trim() || null,
      codigo_barras: form.codigo_barras.trim() || null,
      unidade_medida: form.unidade_medida,
      categoria: form.categoria.trim() || null,
      fornecedor_id: form.fornecedor_id || null,
      custo: Number(form.custo) || 0,
      preco: Number(form.preco) || 0,
      estoque_atual: Number(form.estoque_atual) || 0,
      estoque_minimo: Number(form.estoque_minimo) || 0,
    };

    if (editingProduto) {
      const { error } = await supabase
        .from("produtos")
        .update(data)
        .eq("id", editingProduto.id);

      if (error) {
        toast({
          title: "Erro",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Produto atualizado!" });
    } else {
      const { error } = await supabase
        .from("produtos")
        .insert([data]);

      if (error) {
        toast({
          title: "Erro",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Produto cadastrado!" });
    }

    setOpenProduto(false);
    resetProdutoForm();
    fetchData();
  };

  const handleDelete = async (id: string) => {
    await supabase
      .from("produtos")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);

    toast({ title: "Produto removido" });
    fetchData();
  };

  const handleMovimentacao = async () => {
    if (!empresaId) {
      toast({
        title: "Empresa não encontrada",
        description: "O usuário logado não possui empresa_id no perfil.",
        variant: "destructive",
      });
      return;
    }

    if (!lojaAtiva) {
      toast({
        title: "Loja não selecionada",
        description: "Selecione uma loja antes de movimentar o estoque.",
        variant: "destructive",
      });
      return;
    }

    if (!movForm.produto_id) {
      toast({
        title: "Produto obrigatório",
        description: "Selecione um produto.",
        variant: "destructive",
      });
      return;
    }

    const quantidade = Number(movForm.quantidade);

    if (!quantidade || quantidade <= 0) {
      toast({
        title: "Quantidade inválida",
        description: "Informe uma quantidade maior que zero.",
        variant: "destructive",
      });
      return;
    }

    const isEntrada = movForm.tipo === "entrada";

    const { data: produto, error: produtoError } = await supabase
      .from("produtos")
      .select("id, estoque_atual")
      .eq("id", movForm.produto_id)
      .single();

    if (produtoError || !produto) {
      toast({
        title: "Erro",
        description: produtoError?.message || "Produto não encontrado.",
        variant: "destructive",
      });
      return;
    }

    const novoEstoque = isEntrada
      ? Number(produto.estoque_atual) + quantidade
      : Number(produto.estoque_atual) - quantidade;

    if (novoEstoque < 0) {
      toast({
        title: "Estoque insuficiente",
        description: "Não é possível deixar o estoque negativo.",
        variant: "destructive",
      });
      return;
    }

    const { error: movError } = await supabase
      .from("movimentacoes_estoque")
      .insert({
        empresa_id: empresaId,
        loja_id: lojaAtiva.id,
        produto_id: movForm.produto_id,
        tipo: movForm.tipo,
        quantidade,
        observacao: movForm.observacao || null,
      });

    if (movError) {
      toast({
        title: "Erro",
        description: movError.message,
        variant: "destructive",
      });
      return;
    }

    const { error: updateError } = await supabase
      .from("produtos")
      .update({ estoque_atual: novoEstoque })
      .eq("id", movForm.produto_id);

    if (updateError) {
      toast({
        title: "Erro ao atualizar estoque",
        description: updateError.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: isEntrada ? "Entrada registrada!" : "Saída registrada!",
    });

    setOpenMov(false);
    setMovForm({
      produto_id: "",
      tipo: "entrada",
      quantidade: "",
      observacao: "",
    });

    fetchData();
  };

  const openEdit = (p: Produto) => {
    setEditingProduto(p);
    setForm({
      nome: p.nome,
      codigo: p.codigo || "",
      sku: p.sku || "",
      ean: p.ean || "",
      codigo_barras: p.codigo_barras || "",
      unidade_medida: p.unidade_medida || "UN",
      categoria: p.categoria || "",
      fornecedor_id: p.fornecedor_id || "",
      custo: String(p.custo),
      preco: String(p.preco),
      estoque_atual: String(p.estoque_atual),
      estoque_minimo: String(p.estoque_minimo),
    });
    setOpenProduto(true);
  };

  const categories = [...new Set(produtos.map((p) => p.categoria).filter(Boolean))];

  const filtered = produtos.filter((p) => {
    const termo = search.toLowerCase();

    const matchSearch =
      p.nome.toLowerCase().includes(termo) ||
      (p.codigo || "").toLowerCase().includes(termo) ||
      (p.sku || "").toLowerCase().includes(termo) ||
      (p.ean || "").toLowerCase().includes(termo) ||
      (p.codigo_barras || "").toLowerCase().includes(termo);

    const matchCat = catFilter === "all" || !catFilter || p.categoria === catFilter;

    return matchSearch && matchCat;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Estoque</h1>
          <p className="text-muted-foreground text-sm">Gerenciamento de produtos e movimentações</p>
        </div>

        <div className="flex gap-2">
          <Dialog open={openMov} onOpenChange={setOpenMov}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <ArrowDownCircle className="h-4 w-4 mr-1" />
                Movimentar
              </Button>
            </DialogTrigger>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar Movimentação</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label>Produto</Label>
                  <Select
                    value={movForm.produto_id}
                    onValueChange={(v) => setMovForm({ ...movForm, produto_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {produtos.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Tipo</Label>
                  <Select
                    value={movForm.tipo}
                    onValueChange={(v) => setMovForm({ ...movForm, tipo: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entrada">Entrada</SelectItem>
                      <SelectItem value="saida">Saída</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Quantidade</Label>
                  <Input
                    type="number"
                    min="1"
                    value={movForm.quantidade}
                    onChange={(e) => setMovForm({ ...movForm, quantidade: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Observação</Label>
                  <Input
                    value={movForm.observacao}
                    onChange={(e) => setMovForm({ ...movForm, observacao: e.target.value })}
                  />
                </div>

                <Button onClick={handleMovimentacao} className="w-full">
                  Registrar
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog
            open={openProduto}
            onOpenChange={(v) => {
              setOpenProduto(v);
              if (!v) resetProdutoForm();
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Novo Produto
              </Button>
            </DialogTrigger>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingProduto ? "Editar Produto" : "Novo Produto"}</DialogTitle>
              </DialogHeader>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Nome</Label>
                    <Input
                      value={form.nome}
                      onChange={(e) => setForm({ ...form, nome: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label>SKU</Label>
                    <Input
                      value={form.sku}
                      onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>EAN</Label>
                    <Input
                      value={form.ean}
                      onChange={(e) => setForm({ ...form, ean: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label>Código de Barras</Label>
                    <Input
                      value={form.codigo_barras}
                      onChange={(e) => setForm({ ...form, codigo_barras: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Categoria</Label>
                    <Input
                      value={form.categoria}
                      onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label>Unidade de Medida</Label>
                    <Select
                      value={form.unidade_medida}
                      onValueChange={(v) => setForm({ ...form, unidade_medida: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {UNIDADES_MEDIDA.map((unidade) => (
                          <SelectItem key={unidade.value} value={unidade.value}>
                            {unidade.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Fornecedor</Label>
                    <Select
                      value={form.fornecedor_id}
                      onValueChange={(v) => setForm({ ...form, fornecedor_id: v })}
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
                    <Label>Código Interno (legado)</Label>
                    <Input
                      value={form.codigo}
                      onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Custo (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.custo}
                      onChange={(e) => setForm({ ...form, custo: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label>Preço (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.preco}
                      onChange={(e) => setForm({ ...form, preco: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Estoque Atual</Label>
                    <Input
                      type="number"
                      value={form.estoque_atual}
                      onChange={(e) => setForm({ ...form, estoque_atual: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label>Estoque Mínimo</Label>
                    <Input
                      type="number"
                      value={form.estoque_minimo}
                      onChange={(e) => setForm({ ...form, estoque_minimo: e.target.value })}
                    />
                  </div>
                </div>

                <Button onClick={handleSaveProduto} className="w-full">
                  {editingProduto ? "Salvar Alterações" : "Cadastrar"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, SKU, EAN ou código de barras..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <Select value={catFilter} onValueChange={setCatFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c!} value={c!}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>EAN</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Preço</TableHead>
                <TableHead className="text-center">Estoque</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.nome}</TableCell>
                  <TableCell className="text-muted-foreground">{p.sku}</TableCell>
                  <TableCell className="text-muted-foreground">{p.ean}</TableCell>
                  <TableCell>{p.unidade_medida}</TableCell>
                  <TableCell>{p.categoria}</TableCell>
                  <TableCell className="text-right">R$ {Number(p.preco).toFixed(2)}</TableCell>
                  <TableCell className="text-center">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        p.estoque_atual <= p.estoque_minimo
                          ? "bg-destructive/10 text-destructive"
                          : "bg-success/10 text-success"
                      }`}
                    >
                      {p.estoque_atual <= p.estoque_minimo && (
                        <AlertTriangle className="h-3 w-3" />
                      )}
                      {p.estoque_atual}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(p)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(p.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              {filtered.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center text-muted-foreground py-8"
                  >
                    Nenhum produto encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Estoque;