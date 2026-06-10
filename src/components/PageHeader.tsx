"use client";

type PageHeaderProps = {
  title: string;
  action?: React.ReactNode;
};

export function PageHeader({ title, action }: PageHeaderProps) {
  return (
    <div className="page-header">
      <h1 className="page-title">{title}</h1>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function PageButton({
  children,
  variant = "secondary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
}) {
  const base = "touch-target rounded-xl px-4 py-2.5 text-sm font-medium transition";
  const variants = {
    primary: "bg-orange-600 text-white hover:bg-orange-700",
    secondary: "border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50",
    danger: "border border-red-300 bg-white text-red-700 hover:bg-red-50",
  };
  return (
    <button
      type="button"
      className={`${base} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
