import type { AppRole } from "@/hooks/use-auth";

export type ContributionCategory = "monthly" | "annual" | "registration" | "one_off";

export const ROLE_LABELS: Record<AppRole, string> = {
  administrator: "Administrator",
  chairperson: "Chairperson",
  vice_chairperson: "Vice Chairperson",
  treasurer: "Treasurer",
  financial_analyst: "Financial Analyst",
  secretary: "Secretary",
  vice_secretary: "Vice Secretary",
  member: "Member",
  silent_member: "Silent Member",
};

export const ALL_ROLES: AppRole[] = [
  "administrator",
  "chairperson",
  "vice_chairperson",
  "treasurer",
  "financial_analyst",
  "secretary",
  "vice_secretary",
  "member",
  "silent_member",
];

export const CONTRIBUTION_CATEGORIES: {
  value: ContributionCategory;
  label: string;
  defaultAmount: number;
  minAmount?: number;
  hint: string;
}[] = [
  { value: "monthly", label: "Monthly contribution", defaultAmount: 10000, minAmount: 10000, hint: "Minimum KES 10,000" },
  { value: "annual", label: "Annual subscription", defaultAmount: 2000, hint: "KES 2,000 — due every September" },
  { value: "registration", label: "New member registration fee", defaultAmount: 5000, hint: "KES 5,000 — one-time" },
  { value: "one_off", label: "One-off contribution", defaultAmount: 0, hint: "Flexible amount, anytime" },
];

export const CATEGORY_LABEL: Record<ContributionCategory, string> = Object.fromEntries(
  CONTRIBUTION_CATEGORIES.map((c) => [c.value, c.label])
) as Record<ContributionCategory, string>;

/**
 * Net contribution for a member = deposits (all contributions) − fines − annual subscription − registration fee.
 * Group total = every KES received (all contributions of every category + all fines).
 * Returns 0 when group total is 0.
 */
export function computeMemberPercentage(args: {
  memberContributions: { amount: number | string; category: ContributionCategory }[];
  memberFines: { amount: number | string }[];
  groupContributions: { amount: number | string }[];
  groupFines: { amount: number | string }[];
}) {
  const num = (v: number | string) => Number(v) || 0;
  const memberDeposits = args.memberContributions.reduce((s, r) => s + num(r.amount), 0);
  const memberAnnual = args.memberContributions
    .filter((r) => r.category === "annual")
    .reduce((s, r) => s + num(r.amount), 0);
  const memberReg = args.memberContributions
    .filter((r) => r.category === "registration")
    .reduce((s, r) => s + num(r.amount), 0);
  const memberFineTotal = args.memberFines.reduce((s, r) => s + num(r.amount), 0);

  const net = memberDeposits - memberFineTotal - memberAnnual - memberReg;

  const groupTotal =
    args.groupContributions.reduce((s, r) => s + num(r.amount), 0) +
    args.groupFines.reduce((s, r) => s + num(r.amount), 0);

  const pct = groupTotal > 0 ? (net / groupTotal) * 100 : 0;
  return { net, groupTotal, pct, memberDeposits, memberFineTotal, memberAnnual, memberReg };
}
