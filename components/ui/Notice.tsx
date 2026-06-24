interface NoticeProps {
  message?: string | undefined;
  kind?: "success" | "error" | "info";
}

export function Notice({ message, kind = "info" }: NoticeProps) {
  if (!message) return null;
  return (
    <div className={`notice notice-${kind}`} role={kind === "error" ? "alert" : "status"}>
      {message}
    </div>
  );
}
