import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps extends React.ComponentProps<"input"> {
  autoCapitalizeWords?: boolean;
}

/**
 * Capitalizes the first character of every word (Title / Sentence Case per user requirement).
 * Boundaries include start of string, spaces, hyphens, underscores, slashes, brackets, periods, commas, colons, ampersands.
 */
export function toTitleCase(str: string): string {
  if (!str || typeof str !== "string") return str;
  return str.replace(/(^|[\s\-_/(\[{\\\"“.,;:&])([a-z])/g, (_, boundary, char) => {
    return boundary + char.toUpperCase();
  });
}

const NON_CAPITALIZE_TYPES = new Set([
  "password",
  "email",
  "number",
  "date",
  "datetime-local",
  "time",
  "month",
  "week",
  "file",
  "checkbox",
  "radio",
  "range",
  "color",
  "hidden",
  "url",
  "tel",
]);

const EXCLUDED_NAMES = new Set([
  "password",
  "confirmPassword",
  "currentPassword",
  "newPassword",
  "username",
  "email",
]);

function Input({
  className,
  type,
  autoCapitalizeWords,
  onChange,
  onBlur,
  autoCapitalize,
  ...props
}: InputProps) {
  const isExcludedType = type ? NON_CAPITALIZE_TYPES.has(type.toLowerCase()) : false;
  const isExcludedName = props.name ? EXCLUDED_NAMES.has(props.name) : false;
  const hasExplicitCaseClass =
    typeof className === "string" &&
    /\b(uppercase|lowercase|normal-case)\b/.test(className);
  const hasDisabledAutoCap =
    autoCapitalize === "none" || autoCapitalize === "off";

  const shouldCapitalize =
    autoCapitalizeWords ??
    (!isExcludedType &&
      !isExcludedName &&
      !hasExplicitCaseClass &&
      !hasDisabledAutoCap &&
      !props.readOnly &&
      !props.disabled);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (shouldCapitalize && typeof e.target.value === "string") {
      const original = e.target.value;
      const transformed = toTitleCase(original);
      if (transformed !== original) {
        const { selectionStart, selectionEnd } = e.target;
        e.target.value = transformed;
        onChange?.(e);
        if (selectionStart !== null && selectionEnd !== null) {
          e.target.setSelectionRange(selectionStart, selectionEnd);
        }
        return;
      }
    }
    onChange?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (shouldCapitalize && typeof e.target.value === "string") {
      const original = e.target.value;
      const transformed = toTitleCase(original);
      if (transformed !== original) {
        e.target.value = transformed;
        onChange?.(e as unknown as React.ChangeEvent<HTMLInputElement>);
      }
    }
    onBlur?.(e);
  };

  return (
    <input
      type={type}
      data-slot="input"
      autoCapitalize={autoCapitalize ?? (shouldCapitalize ? "words" : undefined)}
      onChange={handleChange}
      onBlur={handleBlur}
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        shouldCapitalize && "capitalize",
        className
      )}
      {...props}
    />
  )
}

export { Input }

