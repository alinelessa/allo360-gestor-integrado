import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";

interface Cliente {
  id: string;
  nome: string;
  cpf_cnpj: string | null;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
  limite_credito: number;
  status: string;
  loja_id?: string | null;
}

const Clientes = () => {
  const { profile, lojaAtiva } = useAuth();
  const { toast } = useToast();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Cliente | null>(null);
  const [form, setForm] = useState({
    nome: "",
    cpf_cnpj: "",
    telefone: "",
    email: "",
    endereco: "",
    limite_credito: "",
    status: "ativo",
  });

  const empresaId = profile?.empresa_id;
  const lojaId = lojaAtiva?.id;

  const fetchData = async () => {
    if (!empresaId || !lojaId) return;

    const { data } = await supabase
      .from("clientes")
      .select("*")
      .eq("empresa_id", empresaId)
      .eq("loja_id", lojaId)
      .is("deleted_at", null)
      .order("nome");

    if (data) setClientes(data as Cliente[]);
  };

  useEffect(() => {
    fetchData();
  }, [empresaId, lojaId]);

  const handleSave = async () => {
    console.log("handleSave disparou");
    console.log("profile:", profile);
    console.log("empresaId:", empresaId);
    console.log("lojaId:", lojaId);
    console.log("form:", form);

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
      cpf_cnpj: form.cpf_cnpj || null,
      telefone: form.telefone || null,
      email: form.email || null,
      endereco: form.endereco || null,
      limite_credito: Number(form.limite_credito) || 0,
      status: form.status,
    };

    console.log("payload enviado:", data);

    if (editing) {
      const { error } = await supabase
        .from("clientes")
        .update(data)
        .eq("id", editing.id);

      console.log("resultado update:", error);

      if (error) {
        toast({
          title: "Erro",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Cliente atualizado!" });
    } else {
      const { error } = await supabase
        .from("clientes")
        .insert([data]);

      console.log("resultado insert:", error);

      if (error) {
        toast({
          title: "Erro",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Cliente cadastrado!" });
    }

    resetForm();
    fetchData();
  };

  const resetForm = () => {
    setOpen(false);
    setEditing(null);
    setForm({
      nome: "",
      cpf_cnpj: "",
      telefone: "",
      email: "",
      endereco: "",
      limite_credito: "",
      status: "ativo",
    });
  };

  const openEdit = (c: Cliente) => {
    setEditing(c);
    setForm({
      nome: c.nome,
      cpf_cnpj: c.cpf_cnpj || "",
      telefone: c.telefone || "",
      email: c.email || "",
      endereco: c.endereco || "",
      limite_credito: String(c.limite_credito),
      status: c.status,
    });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    await supabase
      .from("clientes")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);

    toast({ title: "Cliente removido" });
    fetchData();
  };

  const filtered = clientes.filter((c) =>
    c.nome.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Clientes</h1>
          <p className="text-muted-foreground text-sm">
            Gerenciamento de clientes
          </p>
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
              Novo Cliente
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editing ? "Editar Cliente" : "Novo Cliente"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Nome</Label>
                  <Input
                    value={form.nome}
                    onChange={(e) =>
                      setForm({ ...form, nome: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label>CPF/CNPJ</Label>
                  <Input
                    value={form.cpf_cnpj}
                    onChange={(e) =>
                      setForm({ ...form, cpf_cnpj: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Telefone</Label>
                  <Input
                    value={form.telefone}
                    onChange={(e) =>
                      setForm({ ...form, telefone: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label>Email</Label>
                  <Input
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                  />
                </div>
              </div>

              <div>
                <Label>Endereço</Label>
                <Input
                  value={form.endereco}
                  onChange={(e) =>
                    setForm({ ...form, endereco: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Limite de Crédito (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.limite_credito}
                    onChange={(e) =>
                      setForm({ ...form, limite_credito: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label>Status</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value })
                    }
                  >
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </div>
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
              placeholder="Buscar cliente..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>CPF/CNPJ</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Limite</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nome}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.cpf_cnpj}
                  </TableCell>
                  <TableCell>{c.telefone}</TableCell>
                  <TableCell>{c.email}</TableCell>
                  <TableCell className="text-right">
                    R$ {Number(c.limite_credito).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={c.status === "ativo" ? "default" : "secondary"}
                    >
                      {c.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(c)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(c.id)}
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
                    colSpan={7}
                    className="text-center text-muted-foreground py-8"
                  >
                    Nenhum cliente encontrado
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

export default Clientes;