"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Match = {
  id: string;
  full_name: string;
  preferred_name: string | null;
  first_visit_date: string;
  last_seen_date: string | null;
};

export function DuplicateNameField({ serviceId }: { serviceId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [name, setName] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const normalized = name.trim();
    if (normalized.length < 2) return;

    let active = true;
    const timer = window.setTimeout(async () => {
      const { data } = await supabase.rpc("search_visitors", {
        p_query: normalized,
        p_service_id: serviceId
      });

      if (!active) return;
      const exact = (data ?? []).filter(
        (visitor) => visitor.full_name.trim().toLocaleLowerCase() === normalized.toLocaleLowerCase()
      );
      setMatches(exact);
      setChecking(false);
    }, 450);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [name, serviceId, supabase]);

  return (
    <div className="field">
      <label htmlFor="fullName">Full name</label>
      <input
        id="fullName"
        name="fullName"
        minLength={2}
        maxLength={100}
        required
        autoComplete="off"
        value={name}
        onChange={(event) => {
          const value = event.target.value;
          setName(value);
          if (value.trim().length < 2) {
            setMatches([]);
            setChecking(false);
          } else {
            setChecking(true);
          }
        }}
        aria-describedby="duplicate-name-status"
      />
      <div id="duplicate-name-status" aria-live="polite">
        {checking ? <small className="muted">Checking existing records…</small> : null}
        {matches.length > 0 ? (
          <div className="notice notice-info">
            <strong>Possible duplicate name.</strong>
            <div className="small">
              {matches.slice(0, 3).map((match) => (
                <div key={match.id}>
                  Existing record {match.id.slice(0, 8)} · first visit {match.first_visit_date}
                  {match.last_seen_date ? ` · last seen ${match.last_seen_date}` : ""}
                  {match.preferred_name ? ` · preferred name ${match.preferred_name}` : ""}
                </div>
              ))}
            </div>
            Confirm this is a different person before creating another record.
          </div>
        ) : null}
      </div>
    </div>
  );
}
