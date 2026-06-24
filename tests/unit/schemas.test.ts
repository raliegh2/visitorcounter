import { describe, expect, it } from "vitest";
import { visitorRegistrationSchema } from "@/lib/schemas";
const base={fullName:"Jordan Blake",preferredName:"Jordan",firstVisitDate:"2026-06-23",optionalContact:"",contactConsent:false,serviceId:"00000000-0000-4000-8000-000000000010"};
describe("visitor registration validation",()=>{
  it("accepts a minimum-data visitor",()=>expect(visitorRegistrationSchema.safeParse(base).success).toBe(true));
  it("requires consent when contact data is provided",()=>expect(visitorRegistrationSchema.safeParse({...base,optionalContact:"jordan@example.test",contactConsent:false}).success).toBe(false));
  it("accepts contact data with consent",()=>expect(visitorRegistrationSchema.safeParse({...base,optionalContact:"jordan@example.test",contactConsent:true}).success).toBe(true));
  it("rejects an invalid service identifier",()=>expect(visitorRegistrationSchema.safeParse({...base,serviceId:"not-a-uuid"}).success).toBe(false));
});
