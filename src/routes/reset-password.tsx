import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MajrLogo } from "@/components/MajrLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, Lock } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Redefinir senha — Leandro MAJR" },
      { name: "description", content: "Defina uma nova senha de acesso ao portal." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Supabase parses the recovery token from the URL hash and emits a
    // PASSWORD_RECOVERY event, establishing a temporary session.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) {
        setReady(true);
      }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (next.length < 8) {
      toast.error("Senha curta", { description: "Use pelo menos 8 caracteres." });
      return;
    }
    if (next !== confirm) {
      toast.error("As senhas não coincidem");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password: next });
    setSubmitting(false);
    if (error) {
      toast.error("Falha ao redefinir senha", { description: error.message });
      return;
    }
    toast.success("Senha redefinida com sucesso");
    navigate({ to: "/login" });
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-10">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 top-10 h-80 w-80 rounded-full bg-primary/30 blur-[120px]" />
        <div className="absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-lilac/20 blur-[140px]" />
      </div>

      <div className="relative w-full max-w-md fade-in">
        <div className="mb-8 flex justify-center">
          <MajrLogo size={56} />
        </div>

        <div className="glass-strong rounded-2xl p-7 sm:p-9">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Redefinir senha
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {ready
              ? "Defina sua nova senha de acesso."
              : "Validando o link de recuperação..."}
          </p>

          <form onSubmit={onSubmit} className="mt-7 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs uppercase tracking-wider text-muted-foreground">
                Nova senha
              </Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={show ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  placeholder="Mínimo 8 caracteres"
                  value={next}
                  onChange={(e) => setNext(e.target.value)}
                  className="h-11 bg-input/50 px-9"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"
                  aria-label={show ? "Ocultar senha" : "Mostrar senha"}
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm" className="text-xs uppercase tracking-wider text-muted-foreground">
                Confirmar nova senha
              </Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="confirm"
                  type={show ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  placeholder="Repita a senha"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="h-11 bg-input/50 pl-9"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={submitting || !ready}
              className="h-11 w-full bg-gradient-to-r from-primary to-[oklch(0.55_0.22_305)] font-medium text-primary-foreground shadow-[0_10px_30px_-10px_oklch(0.42_0.22_305/0.7)] transition-all hover:opacity-95"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar nova senha"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
