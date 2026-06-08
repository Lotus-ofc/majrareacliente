import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { MajrLogo } from "@/components/MajrLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Eye, EyeOff, KeyRound, Loader2, Lock, Mail } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar — Leandro MAJR" },
      { name: "description", content: "Acesso restrito ao portal de clientes." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { signIn, user, role, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [sending, setSending] = useState(false);

  // Password recovery (after clicking the e-mail link)
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  // Supabase emits PASSWORD_RECOVERY once it parses the recovery token from the
  // URL. We open the "set new password" popup instead of navigating away.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setRecoveryOpen(true);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // Don't auto-redirect while the user is in the middle of resetting a password.
    if (loading || !user || recoveryOpen) return;
    navigate({ to: role === "admin" ? "/admin" : "/dashboard" });
  }, [user, role, loading, navigate, recoveryOpen]);

  const onUpdatePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error("Senha curta", { description: "Use pelo menos 8 caracteres." });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    setSaving(true);
    // updateUser acts on the recovery session — only changes THIS user's password.
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(false);
    if (error) {
      toast.error("Falha ao redefinir senha", { description: error.message });
      return;
    }
    toast.success("Senha redefinida com sucesso");
    setRecoveryOpen(false);
    setNewPassword("");
    setConfirmPassword("");
    // Sign out so the user logs in fresh with the new password.
    await supabase.auth.signOut();
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await signIn(email.trim(), password);
    setSubmitting(false);
    if (error) {
      toast.error("Acesso negado", { description: "Credenciais inválidas." });
    } else {
      toast.success("Bem-vindo!");
    }
  };

  const onForgot = async (e: FormEvent) => {
    e.preventDefault();
    const target = resetEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)) {
      toast.error("E-mail inválido");
      return;
    }
    setSending(true);
    const { error } = await supabase.auth.resetPasswordForEmail(target, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSending(false);
    if (error) {
      toast.error("Falha ao enviar", { description: error.message });
      return;
    }
    toast.success("E-mail enviado", {
      description: "Verifique sua caixa de entrada para redefinir a senha.",
    });
    setForgotOpen(false);
    setResetEmail("");
  };


  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-10">
      {/* Decorative gradient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 top-10 h-80 w-80 rounded-full bg-primary/30 blur-[120px]" />
        <div className="absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-lilac/20 blur-[140px]" />
        <div className="absolute right-1/3 top-1/2 h-40 w-40 rounded-full bg-mint/10 blur-[100px]" />
      </div>

      <div className="relative w-full max-w-md fade-in">
        <div className="mb-8 flex justify-center">
          <MajrLogo size={56} />
        </div>

        <div className="glass-strong rounded-2xl p-7 sm:p-9">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Acesse seu portal
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Use o e-mail e a senha enviados pela agência.
          </p>

          <form onSubmit={onSubmit} className="mt-7 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs uppercase tracking-wider text-muted-foreground">
                E-mail
              </Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="voce@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 bg-input/50 pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs uppercase tracking-wider text-muted-foreground">
                Senha
              </Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 bg-input/50 pl-9"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setResetEmail(email);
                    setForgotOpen(true);
                  }}
                  className="text-xs font-medium text-lilac transition-colors hover:text-foreground"
                >
                  Esqueci minha senha
                </button>
              </div>
            </div>


            <Button
              type="submit"
              disabled={submitting}
              className="h-11 w-full bg-gradient-to-r from-primary to-[oklch(0.55_0.22_305)] font-medium text-primary-foreground shadow-[0_10px_30px_-10px_oklch(0.42_0.22_305/0.7)] transition-all hover:opacity-95 hover:shadow-[0_18px_40px_-10px_oklch(0.42_0.22_305/0.85)]"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar no portal"}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Acesso restrito. Solicite suas credenciais ao seu gestor.
          </p>
        </div>
      </div>

      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="glass-strong sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Esqueci minha senha</DialogTitle>
            <DialogDescription>
              Informe seu e-mail e enviaremos um link para redefinir a senha.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onForgot} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">E-mail</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="reset-email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="voce@empresa.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setForgotOpen(false)}
                disabled={sending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={sending}
                className="bg-gradient-to-r from-primary to-[oklch(0.55_0.22_305)] font-medium text-primary-foreground"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar link"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

