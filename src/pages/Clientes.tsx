import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    if (!empresaId || !lojaId) return;

    const payload = {
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

    if (editing) {
      await supabase.from("clientes").update(payload).eq("id", editing.id);
      toast({ title: "Cliente atualizado!" });
    } else {
      await supabase.from("clientes").insert([payload]);
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
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="app-faint text-xs uppercase tracking-[0.12em]">
            Cadastro
          </p>
          <h1 className="text-3xl font-semibold tracking-[-0.03em]">
            Clientes
          </h1>
          <p className="app-soft text-sm">
            Gerencie e acompanhe seus clientes
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Cliente
            </Button>
          </DialogTrigger>

          <DialogContent className="app-glass border-none">
            <DialogHeader>
              <DialogTitle>
                {editing ? "Editar Cliente" : "Novo Cliente"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
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
                  <Label>Limite (R$)</Label>
                  <Input
                    type="number"
                    value={form.limite_credito}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        limite_credito: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <Label>Status</Label>
                  <select
                    className="app-input h-11 w-full"
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
                {editing ? "Salvar alterações" : "Cadastrar cliente"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* LISTA */}
      <Card>
        <CardContent className="p-5">
          <div className="relative mb-5">
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
                  <TableCell className="app-soft">{c.cpf_cnpj}</TableCell>
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
                    <div className="flex justify-end gap-2">
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
                  <TableCell colSpan={7} className="text-center py-10 app-soft">
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