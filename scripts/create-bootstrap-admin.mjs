import { createClient } from "@supabase/supabase-js";

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "BOOTSTRAP_ORGANIZATION_ID",
  "BOOTSTRAP_ORGANIZATION_NAME",
  "BOOTSTRAP_ADMIN_EMAIL",
  "BOOTSTRAP_ADMIN_PASSWORD",
  "BOOTSTRAP_ADMIN_DISPLAY_NAME"
];

for (const name of required) {
  if (!process.env[name]) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

const organizationId = process.env.BOOTSTRAP_ORGANIZATION_ID;
const organizationName = process.env.BOOTSTRAP_ORGANIZATION_NAME;
const email = process.env.BOOTSTRAP_ADMIN_EMAIL;
const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
const displayName = process.env.BOOTSTRAP_ADMIN_DISPLAY_NAME;

const { error: organizationError } = await supabase.from("organizations").upsert({
  id: organizationId,
  name: organizationName
});

if (organizationError) {
  console.error("Organization bootstrap failed:", organizationError.message);
  process.exit(1);
}

const { error: settingsError } = await supabase.from("organization_settings").upsert({
  organization_id: organizationId
});

if (settingsError) {
  console.error("Organization settings bootstrap failed:", settingsError.message);
  process.exit(1);
}

const { data, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  app_metadata: {
    organization_id: organizationId,
    role: "administrator"
  },
  user_metadata: {
    display_name: displayName
  }
});

if (error || !data.user) {
  console.error("Bootstrap administrator creation failed:", error?.message ?? "Unknown error");
  process.exit(1);
}

const { error: profileError } = await supabase.from("user_profiles").upsert({
  id: data.user.id,
  organization_id: organizationId,
  display_name: displayName,
  role: "administrator",
  active: true
});

if (profileError) {
  console.error("Administrator profile creation failed:", profileError.message);
  process.exit(1);
}

console.log(`Bootstrap administrator created for ${email}.`);
console.log("Sign in and enroll TOTP multi-factor authentication immediately.");
