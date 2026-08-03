import { z } from "zod";

const optionalContact = z
  .string()
  .trim()
  .max(120)
  .refine(
    (value) =>
      value === "" ||
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ||
      /^[+()\d\s-]{7,25}$/.test(value),
    "Enter a valid email address or phone number."
  );

const optionalEmail = z.union([z.literal(""), z.email().max(254)]);
const optionalDate = z.union([z.literal(""), z.iso.date()]);

export const loginSchema = z.object({
  email: z.email().max(254),
  // Sign-in must accept existing passwords even if an older account used a shorter password.
  password: z.string().min(1).max(128),
  next: z.string().startsWith("/").max(200).default("/dashboard")
});

export const signupSchema = z
  .object({
    displayName: z.string().trim().min(2).max(80),
    email: z.email().max(254),
    password: z.string().min(12).max(128),
    confirmPassword: z.string().min(12).max(128)
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match."
  });

export const visitorRegistrationSchema = z
  .object({
    fullName: z.string().trim().min(2).max(100),
    preferredName: z.string().trim().max(60),
    firstVisitDate: z.iso.date(),
    optionalContact,
    contactConsent: z.boolean(),
    serviceId: z.uuid()
  })
  .superRefine((value, context) => {
    if (value.optionalContact && !value.contactConsent) {
      context.addIssue({
        code: "custom",
        path: ["contactConsent"],
        message: "Consent is required before storing optional contact information."
      });
    }
  });

export const visitorSearchSchema = z.object({
  query: z.string().trim().min(1).max(100),
  serviceId: z.uuid()
});

export const checkInSchema = z.object({
  visitorId: z.uuid(),
  serviceId: z.uuid()
});

export const serviceSchema = z.object({
  serviceName: z.string().trim().min(2).max(100),
  serviceDate: z.iso.date(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)
});

export const correctionSchema = z.object({
  attendanceId: z.uuid(),
  reason: z.string().trim().min(8).max(240)
});

export const userRoleSchema = z.object({
  userId: z.uuid(),
  role: z.enum(["administrator", "usher", "pastor", "auditor"])
});

export const userActiveSchema = z.object({
  userId: z.uuid(),
  active: z.boolean()
});

export const inviteUserSchema = z.object({
  email: z.email().max(254),
  displayName: z.string().trim().min(2).max(80),
  role: z.enum(["administrator", "usher", "pastor", "auditor"])
});

export const memberSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: optionalEmail,
  phone: z.string().trim().max(40),
  address: z.string().trim().max(240),
  ministry: z.string().trim().max(120),
  joinedDate: optionalDate
});

export const careNoteSchema = z.object({
  personType: z.enum(["visitor", "member"]),
  personId: z.uuid(),
  noteText: z.string().trim().min(2).max(2000),
  noteType: z.enum(["care", "prayer", "follow_up", "visit"]),
  visibility: z.enum(["assigned_team", "pastoral_team", "administrator"])
});

export const visitRecordSchema = z.object({
  personType: z.enum(["visitor", "member"]),
  personId: z.uuid(),
  outcome: z.string().trim().min(2).max(120)
});

export const pastorReviewSchema = z.object({
  userId: z.uuid(),
  decision: z.enum(["approve", "reject"]),
  notes: z.string().trim().max(500)
});

export const importedMemberSchema = z.object({
  first_name: z.string().trim().min(1).max(80),
  last_name: z.string().trim().min(1).max(80),
  email: optionalEmail.default(""),
  phone: z.string().trim().max(40).default(""),
  address: z.string().trim().max(240).default(""),
  ministry: z.string().trim().max(120).default(""),
  joined_date: optionalDate.default("")
});

export const memberImportSchema = z.array(importedMemberSchema).min(1).max(500);

export const retentionSettingsSchema = z.object({
  visitorRetentionMonths: z.coerce.number().int().min(1).max(120),
  contactRetentionMonths: z.coerce.number().int().min(1).max(120),
  attendanceRetentionMonths: z.coerce.number().int().min(1).max(120),
  auditRetentionMonths: z.coerce.number().int().min(6).max(120),
  notSeenDays: z.coerce.number().int().min(7).max(730),
  requireServiceAssignment: z.boolean()
});
