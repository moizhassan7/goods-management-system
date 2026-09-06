import * as React from "react"

import { cn } from "@/lib/utils"
import { toTitleCase } from "@/components/ui/input"

export interface TextareaProps extends React.ComponentProps<"textarea"> {
  autoCapitalizeWords?: boolean;
}

function Textarea({
  className,
  autoCapitalizeWords,
  onChange,
  onBlur,
  autoCapitalize,
  ...props
}: TextareaProps) {
  const hasExplicitCaseClass =
    typeof className === "string" &&
    /\b(uppercase|lowercase|normal-case)\b/.test(className);
  const hasDisabledAutoCap =
    autoCapitalize === "none" || autoCapitalize === "off";

  const shouldCapitalize =
    autoCapitalizeWords === true &&
    !hasExplicitCaseClass &&
    !hasDisabledAutoCap &&
    !props.readOnly &&
    !props.disabled;

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
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

  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    if (shouldCapitalize && typeof e.target.value === "string") {
      const original = e.target.value;
      const transformed = toTitleCase(original);
      if (transformed !== original) {
        e.target.value = transformed;
        onChange?.(e as unknown as React.ChangeEvent<HTMLTextAreaElement>);
      }
    }
    onBlur?.(e);
  };

  return (
    <textarea
      data-slot="textarea"
      autoCapitalize={autoCapitalize ?? (shouldCapitalize ? "words" : undefined)}
      onChange={handleChange}
      onBlur={handleBlur}
      className={cn(
        "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        shouldCapitalize && "capitalize",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }

