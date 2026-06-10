import Link from "next/link";

const sections = [
  { href: "/admin/platillos", title: "Platillos", desc: "Alta, baja lógica y precios" },
  { href: "/admin/categorias", title: "Categorías", desc: "Organiza el menú" },
  { href: "/admin/usuarios", title: "Usuarios", desc: "Roles y accesos" },
  { href: "/admin/configuracion", title: "Configuración", desc: "Nombre del restaurante y RFC" },
  { href: "/admin/corte", title: "Corte de caja", desc: "Reporte diario" },
];

export default function AdminPage() {
  return (
    <div className="min-w-0">
      <h1 className="page-title">Administración</h1>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        {sections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="card block transition hover:border-orange-300 active:scale-[0.99]"
          >
            <h2 className="text-lg font-semibold">{section.title}</h2>
            <p className="mt-1 text-sm text-zinc-500">{section.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
