import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const rafId = useRef<number | null>(null);
  const lastPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const body = document.body;
    body.classList.add("login-bg");

    body.style.setProperty("--mx", "50%");
    body.style.setProperty("--my", "35%");

    const apply = () => {
      rafId.current = null;
      const mx = `${(lastPos.current.x / window.innerWidth) * 100}%`;
      const my = `${(lastPos.current.y / window.innerHeight) * 100}%`;
      body.style.setProperty("--mx", mx);
      body.style.setProperty("--my", my);
    };

    const onMove = (e: MouseEvent) => {
      lastPos.current = { x: e.clientX, y: e.clientY };
      if (rafId.current == null) {
        rafId.current = window.requestAnimationFrame(apply);
      }
    };

    window.addEventListener("mousemove", onMove, { passive: true });

    return () => {
      window.removeEventListener("mousemove", onMove);
      if (rafId.current != null) {
        window.cancelAnimationFrame(rafId.current);
      }

      body.classList.remove("login-bg");
      body.style.removeProperty("--mx");
      body.style.removeProperty("--my");
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signIn(email, password);

    setLoading(false);

    if (error) {
      toast({
        title: "Erro ao entrar",
        description: "Email ou senha inválidos.",
        variant: "destructive",
      });
    } else {
      navigate("/");
    }
  };

  return (
    <div className="relative isolate z-10 flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md app-glass p-2">
        <CardHeader className="items-center pt-10 pb-4">
          <Logo size="lg" />
          <p className="app-soft mt-2 text-sm">
            Sistema de Gestão Empresarial
          </p>
        </CardHeader>

        <CardContent className="px-8 pb-10 pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Senha
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-11 font-semibold"
              disabled={loading}
            >
              {loading ? "Entrando..." : "Entrar"}
            </Button>

            <p className="app-faint mt-6 text-center text-xs">
              © {new Date().getFullYear()} Lessatech
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;