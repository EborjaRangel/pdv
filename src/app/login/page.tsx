import { loginAction } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const error = params.error ? decodeURIComponent(params.error) : "";

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-zinc-950 px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <form
        action={loginAction}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl sm:p-8"
      >
        <h1 className="text-2xl font-bold text-zinc-900">PDV Restaurante</h1>
        <p className="mt-1 text-sm text-zinc-500">Inicia sesión para continuar</p>

        {error ? (
          <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
        ) : null}

        <div className="mt-6 space-y-4">
          <label className="block text-sm font-medium text-zinc-700">
            Correo
            <input
              type="email"
              name="email"
              defaultValue="admin@pdv.local"
              autoComplete="email"
              required
              className="input-touch mt-1 focus:border-orange-500"
            />
          </label>
          <label className="block text-sm font-medium text-zinc-700">
            Contraseña
            <input
              type="password"
              name="password"
              defaultValue="admin123"
              autoComplete="current-password"
              required
              className="input-touch mt-1 focus:border-orange-500"
            />
          </label>
        </div>

        <button
          type="submit"
          className="touch-target mt-6 w-full rounded-xl bg-orange-600 px-4 py-3.5 text-base font-semibold text-white"
        >
          Entrar
        </button>
      </form>
    </div>
  );
}
