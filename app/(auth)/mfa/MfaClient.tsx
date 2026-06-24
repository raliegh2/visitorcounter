"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Factor = {
  id: string;
};

export function MfaClient() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedNext = searchParams.get("next");
  const next = requestedNext?.startsWith("/") && !requestedNext.startsWith("//")
    ? requestedNext
    : "/dashboard";

  const [factor, setFactor] = useState<Factor | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("Checking multi-factor status…");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;

    async function initialize() {
      const { data: level } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (!active) return;

      if (level?.currentLevel === "aal2") {
        router.replace(next);
        return;
      }

      const { data, error } = await supabase.auth.mfa.listFactors();
      if (!active) return;

      if (error) {
        setMessage("Multi-factor status could not be loaded.");
        return;
      }

      const verified = data.totp.find((item) => item.status === "verified");
      if (verified) {
        setFactor({ id: verified.id });
        setMessage("Enter the six-digit code from your authenticator app.");
        return;
      }

      const enrolled = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Church Visitor Attendance"
      });

      if (!active) return;
      if (enrolled.error) {
        setMessage("Multi-factor enrollment could not be started.");
        return;
      }

      setFactor({ id: enrolled.data.id });
      setQrCode(enrolled.data.totp.qr_code);
      setMessage("Scan the QR code with an authenticator app, then enter the six-digit code.");
    }

    void initialize();
    return () => {
      active = false;
    };
  }, [next, router, supabase]);

  async function verify() {
    if (!factor || !/^\d{6}$/.test(code)) {
      setMessage("Enter a valid six-digit authentication code.");
      return;
    }

    setBusy(true);
    const challenge = await supabase.auth.mfa.challenge({ factorId: factor.id });
    if (challenge.error) {
      setMessage("The authentication challenge could not be created.");
      setBusy(false);
      return;
    }

    const verification = await supabase.auth.mfa.verify({
      factorId: factor.id,
      challengeId: challenge.data.id,
      code
    });

    if (verification.error) {
      setMessage("The authentication code was not accepted.");
      setBusy(false);
      return;
    }

    router.replace(next);
    router.refresh();
  }

  return (
    <div className="login-card">
      <div className="eyebrow">Administrator verification</div>
      <h1>Multi-factor authentication</h1>
      <p className="muted">{message}</p>

      {qrCode ? (
        <div className="card" style={{ textAlign: "center", marginBlock: 18 }}>
          {/* Supabase returns a self-contained data URI for the TOTP QR code. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrCode} alt="Authenticator enrollment QR code" width={220} height={220} />
        </div>
      ) : null}

      <div className="field">
        <label htmlFor="mfa-code">Six-digit code</label>
        <input
          id="mfa-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
        />
      </div>
      <div className="field">
        <button
          className="button button-primary button-full"
          type="button"
          onClick={verify}
          disabled={busy || !factor}
        >
          {busy ? "Verifying…" : "Verify and continue"}
        </button>
      </div>
    </div>
  );
}
