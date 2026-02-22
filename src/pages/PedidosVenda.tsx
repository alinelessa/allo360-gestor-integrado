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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, CheckCircle, ShoppingCart } from "lucide-react";

interface PedidoItem {
  produto_id: string;
  produto_nome?: string;
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
}

const statusMap: Record<string, string> = {
  rascunho: "secondary",
  finalizado: "default",
  cancelado: "destructive",
};

const PedidosVenda = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const empresaId = profile?.empresa_id;

  const [pedidos, setPedidos] = useState<any[]>([]);
  const [clientes, setClientes] = useState<{ id: string; nome: string }[]>([]);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ cliente_id: "", observacao: "", nota_fiscal: "" });
  const [itens, setItens] = useState<PedidoItem[]>([]);
  const [itemForm, setItemForm] = useState({ produto_id: "", quantidade: "1" });

  const fetchData = async () => {
    if (!empresaId) return;
    const [p, c, pr] = await Promise.all([
      supabase.from("pedidos_venda").select("*, clientes(nome)").eq("empresa_id", empresaId).is("deleted_at", null).order("created_at", { ascending: false }),
      supabase.from("clientes").select("id, nome").eq("empresa_id", empresaId).is("deleted_at", null),
      supabase.from("produtos").select("*").eq("empresa_id", empresaId).is("deleted_at", null),
    ]);
    if (p.data) setPedidos(p.data);
    if (c.data) setClientes(c.data);
    if (pr.data) setProdutos(pr.data);
  };

  useEffect(() => { fetchData(); }, [empresaId]);

  const addItem = () => {
    const prod = produtos.find(p => p.id === itemForm.produto_id);
    if (!prod) return;
    const qty = Number(itemForm.quantidade) || 1;
    setItens([...itens, {
      produto_id: prod.id,
      produto_nome: prod.nome,
      quantidade: qty,
      preco_unitario: Number(prod.preco),
      subtotal: qty * Number(prod.preco),
    }]);
    setItemForm({ produto_id: "", quantidade: "1" });
  };

  const removeItem = (idx: number) => setItens(itens.filter((_, i) => i !== idx));

  const totalPedido = itens.reduce((s, i) => s + i.subtotal, 0);

  const handleSave = async () => {
    if (!empresaId || itens.length === 0) {
      toast({ title: "Adicione pelo menos um item", variant: "destructive" });
      return;
    }

    const { data: pedido, error } = await supabase.from("pedidos_venda").insert({
      empresa_id: empresaId,
      cliente_id: form.cliente_id || null,
      subtotal: totalPedido,
      total: totalPedido,
      observacao: form.observacao || null,
      nota_fiscal: form.nota_fiscal || null,
    }).select().single();

    if (error || !pedido) {
      toast({ title: "Erro ao criar pedido", description: error?.message, variant: "destructive" });
      return;
    }

    const itensData = itens.map(i => ({
      pedido_id: pedido.id,
      empresa_id: empresaId,
      produto_id: i.produto_id,
      quantidade: i.quantidade,
      preco_unitario: i.preco_unitario,
      subtotal: i.subtotal,
    }));

    await supabase.from("pedido_venda_itens").insert(itensData);
    toast({ title: "Pedido de venda criado!" });
    setOpen(false);
    setForm({ cliente_id: "", observacao: "", nota_fiscal: "" });
    setItens([]);
    fetchData();
  };

  const handleFinalizar = async (pedidoId: string) => {
    const { error } = await supabase.rpc("finalizar_pedido_venda", { _pedido_id: pedidoId });
    if (error) {
      toast({ title: "Erro ao finalizar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Pedido finalizado! Estoque baixado e conta a receber criada." });
    fetchData();
  };

  const handleCancelar = async (pedidoId: string) => {
    await supabase.from("pedidos_venda").update({ status: "cancelado" }).eq("id", pedidoId);
    toast({ title: "Pedido cancelado" });
    fetchData();
  };

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pedidos de Venda</h1>
          <p className="text-muted-foreground text-sm">Gerencie seus pedidos de venda</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setForm({ cliente_id: "", observacao: "", nota_fiscal: "" }); setItens([]); } }}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Novo Pedido</Button></DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Novo Pedido de Venda</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Cliente</Label>
                  <Select value={form.cliente_id} onValueChange={v => setForm({ ...form, cliente_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>NF (opcional)</Label><Input value={form.nota_fiscal} onChange={e => setForm({ ...form, nota_fiscal: e.target.value })} /></div>
              </div>
              <div><Label>Observação</Label><Input value={form.observacao} onChange={e => setForm({ ...form, observacao: e.target.value })} /></div>

              <Card className="bg-muted/30">
                <CardHeader className="py-3"><CardTitle className="text-sm">Itens do Pedido</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    <Select value={itemForm.produto_id} onValueChange={v => setItemForm({ ...itemForm, produto_id: v })}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Produto" /></SelectTrigger>
                      <SelectContent>{produtos.map(p => <SelectItem key={p.id} value={p.id}>{p.nome} — {fmt(Number(p.preco))}</SelectItem>)}</SelectContent>
                    </Select>
                    <Input type="number" min="1" className="w-20" value={itemForm.quantidade} onChange={e => setItemForm({ ...itemForm, quantidade: e.target.value })} />
                    <Button type="button" variant="outline" onClick={addItem}><Plus className="h-4 w-4" /></Button>
                  </div>

                  {itens.length > 0 && (
                    <Table>
                      <TableHeader><TableRow>
                        <TableHead>Produto</TableHead><TableHead className="text-center">Qtd</TableHead>
                        <TableHead className="text-right">Unit.</TableHead><TableHead className="text-right">Subtotal</TableHead><TableHead />
                      </TableRow></TableHeader>
                      <TableBody>
                        {itens.map((item, i) => (
                          <TableRow key={i}>
                            <TableCell className="text-sm">{item.produto_nome}</TableCell>
                            <TableCell className="text-center">{item.quantidade}</TableCell>
                            <TableCell className="text-right">{fmt(item.preco_unitario)}</TableCell>
                            <TableCell className="text-right font-medium">{fmt(item.subtotal)}</TableCell>
                            <TableCell><Button variant="ghost" size="icon" onClick={() => removeItem(i)}><Trash2 className="h-3 w-3 text-destructive" /></Button></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                  <div className="text-right font-bold text-lg">Total: {fmt(totalPedido)}</div>
                </CardContent>
              </Card>

              <Button onClick={handleSave} className="w-full" disabled={itens.length === 0}>
                <ShoppingCart className="h-4 w-4 mr-2" /> Criar Pedido
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>NF</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pedidos.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">#{p.numero}</TableCell>
                  <TableCell>{(p as any).clientes?.nome || "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{p.nota_fiscal || "—"}</TableCell>
                  <TableCell className="text-right font-medium">{fmt(Number(p.total))}</TableCell>
                  <TableCell><Badge variant={statusMap[p.status] as any || "secondary"}>{p.status}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(p.created_at).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell className="text-right">
                    {p.status === "rascunho" && (
                      <div className="flex justify-end gap-1">
                        <Button variant="outline" size="sm" onClick={() => handleFinalizar(p.id)}>
                          <CheckCircle className="h-3 w-3 mr-1" /> Finalizar
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleCancelar(p.id)} className="text-destructive">Cancelar</Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {pedidos.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum pedido</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default PedidosVenda;
