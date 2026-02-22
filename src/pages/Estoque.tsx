import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Package, AlertTriangle, ArrowDownCircle, ArrowUpCircle, Search, Pencil, Trash2 } from "lucide-react";

interface Produto {
  id: string;
  nome: string;
  codigo: string | null;
  categoria: string | null;
  fornecedor_id: string | null;
  custo: number;
  preco: number;
  estoque_atual: number;
  estoque_minimo: number;
}

interface Fornecedor {
  id: string;
  nome: string;
}

const Estoque = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [openProduto, setOpenProduto] = useState(false);
  const [openMov, setOpenMov] = useState(false);
  const [editingProduto, setEditingProduto] = useState<Produto | null>(null);
  const [form, setForm] = useState({ nome: "", codigo: "", categoria: "", fornecedor_id: "", custo: "", preco: "", estoque_atual: "", estoque_minimo: "" });
  const [movForm, setMovForm] = useState({ produto_id: "", tipo: "entrada", quantidade: "", observacao: "" });

  const empresaId = profile?.empresa_id;

  const fetchData = async () => {
    if (!empresaId) return;
    const [p, f] = await Promise.all([
      supabase.from("produtos").select("*").eq("empresa_id", empresaId).is("deleted_at", null).order("nome"),
      supabase.from("fornecedores").select("id, nome").eq("empresa_id", empresaId).is("deleted_at", null),
    ]);
    if (p.data) setProdutos(p.data as Produto[]);
    if (f.data) setFornecedores(f.data as Fornecedor[]);
  };

  useEffect(() => { fetchData(); }, [empresaId]);

  const handleSaveProduto = async () => {
    if (!empresaId) return;
    const data = {
      empresa_id: empresaId,
      nome: form.nome,
      codigo: form.codigo || null,
      categoria: form.categoria || null,
      fornecedor_id: form.fornecedor_id || null,
      custo: Number(form.custo) || 0,
      preco: Number(form.preco) || 0,
      estoque_atual: Number(form.estoque_atual) || 0,
      estoque_minimo: Number(form.estoque_minimo) || 0,
    };

    if (editingProduto) {
      const { error } = await supabase.from("produtos").update(data).eq("id", editingProduto.id);
      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Produto atualizado!" });
    } else {
      const { error } = await supabase.from("produtos").insert(data);
      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Produto cadastrado!" });
    }
    setOpenProduto(false);
    setEditingProduto(null);
    setForm({ nome: "", codigo: "", categoria: "", fornecedor_id: "", custo: "", preco: "", estoque_atual: "", estoque_minimo: "" });
    fetchData();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("produtos").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    toast({ title: "Produto removido" });
    fetchData();
  };

  const handleMovimentacao = async () => {
    if (!empresaId) return;
    const { error } = await supabase.from("movimentacoes_estoque").insert({
      empresa_id: empresaId,
      produto_id: movForm.produto_id,
      tipo: movForm.tipo,
      quantidade: Number(movForm.quantidade),
      observacao: movForm.observacao || null,
    });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: `${movForm.tipo === "entrada" ? "Entrada" : "Saída"} registrada!` });
    setOpenMov(false);
    setMovForm({ produto_id: "", tipo: "entrada", quantidade: "", observacao: "" });
    fetchData();
  };

  const openEdit = (p: Produto) => {
    setEditingProduto(p);
    setForm({
      nome: p.nome, codigo: p.codigo || "", categoria: p.categoria || "",
      fornecedor_id: p.fornecedor_id || "", custo: String(p.custo), preco: String(p.preco),
      estoque_atual: String(p.estoque_atual), estoque_minimo: String(p.estoque_minimo),
    });
    setOpenProduto(true);
  };

  const categories = [...new Set(produtos.map(p => p.categoria).filter(Boolean))];
  const filtered = produtos.filter(p => {
    const matchSearch = p.nome.toLowerCase().includes(search.toLowerCase()) || (p.codigo || "").toLowerCase().includes(search.toLowerCase());
    const matchCat = !catFilter || catFilter === "all" || p.categoria === catFilter;
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
              <Button variant="outline" size="sm"><ArrowDownCircle className="h-4 w-4 mr-1" /> Movimentar</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Registrar Movimentação</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Produto</Label>
                  <Select value={movForm.produto_id} onValueChange={(v) => setMovForm({ ...movForm, produto_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{produtos.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tipo</Label>
                  <Select value={movForm.tipo} onValueChange={(v) => setMovForm({ ...movForm, tipo: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entrada">Entrada</SelectItem>
                      <SelectItem value="saida">Saída</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Quantidade</Label>
                  <Input type="number" min="1" value={movForm.quantidade} onChange={(e) => setMovForm({ ...movForm, quantidade: e.target.value })} />
                </div>
                <div>
                  <Label>Observação</Label>
                  <Input value={movForm.observacao} onChange={(e) => setMovForm({ ...movForm, observacao: e.target.value })} />
                </div>
                <Button onClick={handleMovimentacao} className="w-full">Registrar</Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={openProduto} onOpenChange={(v) => { setOpenProduto(v); if (!v) { setEditingProduto(null); setForm({ nome: "", codigo: "", categoria: "", fornecedor_id: "", custo: "", preco: "", estoque_atual: "", estoque_minimo: "" }); } }}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Novo Produto</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editingProduto ? "Editar Produto" : "Novo Produto"}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Nome</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
                  <div><Label>Código</Label><Input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Categoria</Label><Input value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} /></div>
                  <div>
                    <Label>Fornecedor</Label>
                    <Select value={form.fornecedor_id} onValueChange={(v) => setForm({ ...form, fornecedor_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{fornecedores.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Custo (R$)</Label><Input type="number" step="0.01" value={form.custo} onChange={(e) => setForm({ ...form, custo: e.target.value })} /></div>
                  <div><Label>Preço (R$)</Label><Input type="number" step="0.01" value={form.preco} onChange={(e) => setForm({ ...form, preco: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Estoque Atual</Label><Input type="number" value={form.estoque_atual} onChange={(e) => setForm({ ...form, estoque_atual: e.target.value })} /></div>
                  <div><Label>Estoque Mínimo</Label><Input type="number" value={form.estoque_minimo} onChange={(e) => setForm({ ...form, estoque_minimo: e.target.value })} /></div>
                </div>
                <Button onClick={handleSaveProduto} className="w-full">{editingProduto ? "Salvar Alterações" : "Cadastrar"}</Button>
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
              <Input placeholder="Buscar produto..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={catFilter} onValueChange={setCatFilter}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Categoria" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {categories.map(c => <SelectItem key={c!} value={c!}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Custo</TableHead>
                <TableHead className="text-right">Preço</TableHead>
                <TableHead className="text-center">Estoque</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.nome}</TableCell>
                  <TableCell className="text-muted-foreground">{p.codigo}</TableCell>
                  <TableCell>{p.categoria}</TableCell>
                  <TableCell className="text-right">R$ {Number(p.custo).toFixed(2)}</TableCell>
                  <TableCell className="text-right">R$ {Number(p.preco).toFixed(2)}</TableCell>
                  <TableCell className="text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${p.estoque_atual <= p.estoque_minimo ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"}`}>
                      {p.estoque_atual <= p.estoque_minimo && <AlertTriangle className="h-3 w-3" />}
                      {p.estoque_atual}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum produto encontrado</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Estoque;
