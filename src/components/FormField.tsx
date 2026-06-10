"use client";

import { useField } from "formik";
import type { InputHTMLAttributes, SelectHTMLAttributes } from "react";

const inputClass =
  "input-touch mt-1 focus:border-orange-500";
const errorClass = "mt-1 text-sm text-red-600";

type FormFieldProps = {
  label: string;
  name: string;
} & InputHTMLAttributes<HTMLInputElement>;

export function FormField({ label, name, className, ...props }: FormFieldProps) {
  const [field, meta] = useField(name);
  const hasError = meta.touched && meta.error;

  return (
    <label className="block text-sm font-medium text-zinc-700">
      {label}
      <input
        {...field}
        {...props}
        id={name}
        className={`${inputClass} ${hasError ? "border-red-400" : ""} ${className ?? ""}`}
      />
      {hasError ? <p className={errorClass}>{meta.error}</p> : null}
    </label>
  );
}

type FormSelectProps = {
  label: string;
  name: string;
  children: React.ReactNode;
} & SelectHTMLAttributes<HTMLSelectElement>;

export function FormSelect({
  label,
  name,
  children,
  className,
  ...props
}: FormSelectProps) {
  const [field, meta] = useField(name);
  const hasError = meta.touched && meta.error;

  return (
    <label className="block text-sm font-medium text-zinc-700">
      {label}
      <select
        {...field}
        {...props}
        id={name}
        className={`${inputClass} ${hasError ? "border-red-400" : ""} ${className ?? ""}`}
      >
        {children}
      </select>
      {hasError ? <p className={errorClass}>{meta.error}</p> : null}
    </label>
  );
}

export function FormError({ name }: { name: string }) {
  const [, meta] = useField(name);
  if (!meta.touched || !meta.error) return null;
  return <p className={errorClass}>{meta.error}</p>;
}
