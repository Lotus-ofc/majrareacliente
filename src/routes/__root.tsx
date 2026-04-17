import { Outlet, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import appCss from "../styles.css?url";
import { AuthProvider } from "@/lib/auth-context";
import { Toaster } from "@/components/ui/sonner";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Leandro MAJR — Área do Cliente" },
      { name: "description", content: "Portal exclusivo para acompanhamento de relatórios exclusivo para clientes da agência Leandro MAJR." },
      { name: "author", content: "Leandro MAJR" },
      { property: "og:title", content: "Leandro MAJR — Área do Cliente" },
      { property: "og:description", content: "Portal exclusivo para acompanhamento de relatórios exclusivo para clientes da agência Leandro MAJR." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Leandro MAJR — Área do Cliente" },
      { name: "twitter:description", content: "Portal exclusivo para acompanhamento de relatórios exclusivo para clientes da agência Leandro MAJR." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/4c0c7574-25a8-4ed9-8bab-a4b297ac55fc/id-preview-8678106d--863991a0-ab83-49e6-ab70-3704969c8855.lovable.app-1776457723663.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/4c0c7574-25a8-4ed9-8bab-a4b297ac55fc/id-preview-8678106d--863991a0-ab83-49e6-ab70-3704969c8855.lovable.app-1776457723663.png" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap",
      },
      { rel: "stylesheet", href: appCss },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <AuthProvider>
      <Outlet />
      <Toaster theme="dark" position="top-right" />
    </AuthProvider>
  );
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-gradient-brand">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          O endereço acessado não existe ou foi movido.
        </p>
        <a
          href="/"
          className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
        >
          Voltar ao início
        </a>
      </div>
    </div>
  );
}
