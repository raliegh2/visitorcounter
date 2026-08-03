"use client";

import { useFormStatus } from "react-dom";

interface SubmitButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  children: React.ReactNode;
  pendingLabel?: string;
}

export function SubmitButton({
  children,
  pendingLabel = "Saving…",
  className = "button button-primary",
  type = "submit",
  ...buttonProps
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <button
      {...buttonProps}
      className={className}
      type={type}
      disabled={pending || buttonProps.disabled}
      aria-disabled={pending || buttonProps.disabled}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
