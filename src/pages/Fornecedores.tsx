import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";

interface Fornecedor {
  id: string;
  nome: string;
  cnpj: string | null;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
  loja_id?: string | null;
}

const Fornecedores = () => {
  const { profile, lojaAtiva } = useAuth();
  const { toast } = useToast();
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Fornecedor | null>(null);
  const [form, setForm] = useState({
    nome: "",
    cnpj: "",
    telefone: "",
    email: "",
    endereco: "",
  });

  const empresaId = profile?.empresa_id;
  const lojaId = lojaAtiva?.id;

  const fetchData = async () => {
    if (!empresaId || !lojaId) return;

    const { data } = await supabase
      .from("fornecedores")
      .select("*")
      .eq("empresa_id", empresaId)
      .eq("loja_id", lojaId)
      .is("deleted_at", null)
      .order("nome");

    if (data) setFornecedores(data as Fornecedor[]);
  };

  useEffect(() => {
    fetchData();
  }, [empresaId, lojaId]);

  const handleSave = async () => {
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

    const data = {
      empresa_id: empresaId,
      loja_id: lojaId,
      nome: form.nome,
      cnpj: form.cnpj || null,
      telefone: form.telefone || null,
      email: form.email || null,
      endereco: form.endereco || null,
    };

    if (editing) {
      const { error } = await supabase
        .from("fornecedores")
        .update(data)
        .eq("id", editing.id);

      if (error) {
        toast({
          title: "Erro",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Fornecedor atualizado!" });
    } else {
      const { error } = await supabase
        .from("fornecedores")
        .insert([data]);

      if (error) {
        toast({
          title: "Erro",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Fornecedor cadastrado!" });
    }

    resetForm();
    fetchData();
  };

  const resetForm = () => {
    setOpen(false);
    setEditing(null);
    setForm({
      nome: "",
      cnpj: "",
      telefone: "",
      email: "",
      endereco: "",
    });
  };

  const openEdit = (f: Fornecedor) => {
    setEditing(f);
    setForm({
      nome: f.nome,
      cnpj: f.cnpj || "",
      telefone: f.telefone || "",
      email: f.email || "",
      endereco: f.endereco || "",
    });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    await supabase
      .from("fornecedores")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);

    toast({ title: "Fornecedor removido" });
    fetchData();
  };

  const filtered = fornecedores.filter((f) =>
    f.nome.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Fornecedores</h1>
          <p className="text-muted-foreground text-sm">Gerenciamento de fornecedores</p>
        </div>

        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Novo Fornecedor
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editing ? "Editar Fornecedor" : "Novo Fornecedor"}
              </DialogTitle>
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
                  <Label>CNPJ</Label>
                  <Input
                    value={form.cnpj}
                    onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Telefone</Label>
                  <Input
                    value={form.telefone}
                    onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Email</Label>
                  <Input
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>Endereço</Label>
                <Input
                  value={form.endereco}
                  onChange={(e) => setForm({ ...form, endereco: e.target.value })}
                />
              </div>

              <Button onClick={handleSave} className="w-full">
                {editing ? "Salvar" : "Cadastrar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar fornecedor..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Endereço</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filtered.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">{f.nome}</TableCell>
                  <TableCell className="text-muted-foreground">{f.cnpj}</TableCell>
                  <TableCell>{f.telefone}</TableCell>
                  <TableCell>{f.email}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{f.endereco}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(f)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(f.id)}
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
                    colSpan={6}
                    className="text-center text-muted-foreground py-8"
                  >
                    Nenhum fornecedor encontrado
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

export default Fornecedores;