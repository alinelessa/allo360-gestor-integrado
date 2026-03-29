import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "admin" | "financeiro" | "estoque" | "usuario";

interface Profile {
  id: string;
  user_id: string;
  empresa_id: string;
  nome: string;
  email: string;
}

interface EmpresaUsuario {
  id: string;
  empresa_id: string;
  user_id: string;
  ativo: boolean;
  is_owner: boolean;
}

interface Loja {
  id: string;
  empresa_id: string;
  nome: string;
  codigo: string | null;
  ativo: boolean;
}

interface AssistantContextData {
  empresaId: string | null;
  lojaId: string | null;
  lojaNome: string | null;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  roles: AppRole[];
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  empresaUsuario: EmpresaUsuario | null;
  lojas: Loja[];
  lojaAtiva: Loja | null;
  empresaIdAtiva: string | null;
  assistantContext: AssistantContextData;
  setLojaAtiva: (loja: Loja | null) => void;
  roles: AppRole[];
  loading: boolean;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [empresaUsuario, setEmpresaUsuario] = useState<EmpresaUsuario | null>(
    null
  );
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [lojaAtiva, setLojaAtivaState] = useState<Loja | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const setLojaAtiva = (loja: Loja | null) => {
    setLojaAtivaState(loja);

    if (loja) {
      localStorage.setItem("lojaAtivaId", loja.id);
    } else {
      localStorage.removeItem("lojaAtivaId");
    }
  };

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("Erro ao buscar profile:", error);
      setProfile(null);
      return null;
    }

    if (data) {
      const profileData = data as Profile;
      setProfile(profileData);
      return profileData;
    }

    setProfile(null);
    return null;
  };

  const fetchEmpresaUsuario = async (userId: string) => {
    const { data, error } = await (supabase as any)
      .from("empresa_usuarios")
      .select("*")
      .eq("user_id", userId)
      .eq("ativo", true)
      .maybeSingle();

    if (error) {
      console.error("Erro ao buscar empresa_usuarios:", error);
      setEmpresaUsuario(null);
      return null;
    }

    if (data) {
      const empresaUsuarioData = data as EmpresaUsuario;
      setEmpresaUsuario(empresaUsuarioData);
      return empresaUsuarioData;
    }

    setEmpresaUsuario(null);
    return null;
  };

  const fetchLojas = async (userId: string, empresaId: string) => {
    const { data: relacoes, error: relError } = await supabase
      .from("usuario_lojas")
      .select("loja_id, empresa_id")
      .eq("user_id", userId);

    if (relError) {
      console.error("Erro ao buscar usuario_lojas:", relError);
      setLojas([]);
      setLojaAtivaState(null);
      return [];
    }

    const lojaIds =
      relacoes
        ?.filter((r: any) => r.empresa_id === empresaId)
        .map((r: any) => r.loja_id)
        .filter(Boolean) ?? [];

    if (lojaIds.length === 0) {
      setLojas([]);
      setLojaAtivaState(null);
      localStorage.removeItem("lojaAtivaId");
      return [];
    }

    const { data: lojasData, error: lojasError } = await supabase
      .from("lojas")
      .select("id, empresa_id, nome, codigo, ativo")
      .in("id", lojaIds);

    if (lojasError) {
      console.error("Erro ao buscar lojas:", lojasError);
      setLojas([]);
      setLojaAtivaState(null);
      return [];
    }

    const lojasUsuario: Loja[] =
      lojasData?.map((loja: any) => ({
        id: loja.id,
        empresa_id: loja.empresa_id,
        nome: loja.nome,
        codigo: loja.codigo,
        ativo: loja.ativo,
      })) ?? [];

    setLojas(lojasUsuario);

    const lojaAtivaIdSalva = localStorage.getItem("lojaAtivaId");
    const lojaSalva = lojasUsuario.find(
      (loja) => loja.id === lojaAtivaIdSalva
    );
    const primeiraLoja = lojasUsuario[0] ?? null;
    const lojaInicial = lojaSalva ?? primeiraLoja;

    setLojaAtivaState(lojaInicial);

    if (lojaInicial) {
      localStorage.setItem("lojaAtivaId", lojaInicial.id);
    } else {
      localStorage.removeItem("lojaAtivaId");
    }

    return lojasUsuario;
  };

  const fetchRoles = async (userId: string) => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    if (error) {
      console.error("Erro ao buscar user_roles:", error);
      setRoles([]);
      return;
    }

    if (data) {
      setRoles(data.map((r: any) => r.role as AppRole));
      return;
    }

    setRoles([]);
  };

  const loadUserData = async (userId: string) => {
    const profileData = await fetchProfile(userId);
    await fetchRoles(userId);

    const empresaUsuarioData = await fetchEmpresaUsuario(userId);
    const empresaId = empresaUsuarioData?.empresa_id || profileData?.empresa_id;

    if (empresaId) {
      await fetchLojas(userId, empresaId);
    } else {
      setLojas([]);
      setLojaAtivaState(null);
      localStorage.removeItem("lojaAtivaId");
    }
  };

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        setTimeout(async () => {
          await loadUserData(session.user.id);
          setLoading(false);
        }, 0);
      } else {
        setProfile(null);
        setEmpresaUsuario(null);
        setLojas([]);
        setLojaAtivaState(null);
        setRoles([]);
        localStorage.removeItem("lojaAtivaId");
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await loadUserData(session.user.id);
      }

      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setEmpresaUsuario(null);
    setLojas([]);
    setLojaAtivaState(null);
    setRoles([]);
    localStorage.removeItem("lojaAtivaId");
  };

  const hasRole = (role: AppRole) => roles.includes(role);

  const empresaIdAtiva =
    empresaUsuario?.empresa_id || profile?.empresa_id || null;

  const assistantContext: AssistantContextData = {
    empresaId: empresaIdAtiva,
    lojaId: lojaAtiva?.id ?? null,
    lojaNome: lojaAtiva?.nome ?? null,
    userId: user?.id ?? null,
    userName: profile?.nome ?? user?.email ?? null,
    userEmail: profile?.email ?? user?.email ?? null,
    roles,
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        empresaUsuario,
        lojas,
        lojaAtiva,
        empresaIdAtiva,
        assistantContext,
        setLojaAtiva,
        roles,
        loading,
        signIn,
        signOut,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};