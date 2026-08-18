import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-10">
      <div className="grid w-full overflow-hidden rounded-3xl border bg-card shadow-sm lg:grid-cols-[1.1fr_0.9fr]">
        <section className="relative hidden bg-primary p-10 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-primary-foreground/70">
              Patel CRM
            </p>
            <h1 className="mt-4 font-serif text-4xl leading-tight">
              El hub de Visor para las peticiones de todos los clientes.
            </h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-primary-foreground/80">
              Visor concentra el trabajo. Cada cliente entra a revisar y comentar solo lo suyo.
            </p>
          </div>
          <ul className="space-y-2 text-sm text-primary-foreground/75">
            <li>• Tablero único para Visor, filtrado por cliente</li>
            <li>• Alta de cuentas solo con invitación</li>
            <li>• Comentarios, evidencias y avisos por correo</li>
          </ul>
        </section>
        <section className="p-8 sm:p-10">
          <div className="mb-8 lg:hidden">
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Patel CRM</p>
            <h1 className="mt-2 text-2xl font-semibold">Entra al tablero</h1>
          </div>
          <h2 className="hidden text-2xl font-semibold lg:block">Acceso al tablero</h2>
          <p className="mb-6 mt-2 text-sm text-muted-foreground">
            Usa la cuenta que Visor te asignó. El registro abierto ya no está disponible.
          </p>
          <LoginForm />
        </section>
      </div>
    </main>
  );
}
