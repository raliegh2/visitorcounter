"use client";

import { useFormStatus } from "react-dom";

interface ConfirmSubmitButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children" | "onClick"> {
  children: React.ReactNode;
  confirmation: string;
  pendingLabel?: string;
}

export function ConfirmSubmitButton({
  children,
  confirmation,
  pendingLabel = "Working…",
  className = "button button-danger",
  type = "submit",
  ...buttonProps
}: ConfirmSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      {...buttonProps}
      className={className}
      type={type}
      disabled={pending || buttonProps.disabled}
      aria-disabled={pending || buttonProps.disabled}
      onClick={(event) => {
        if (!window.confirm(confirmation)) {
          event.preventDefault();
        }
      }}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
