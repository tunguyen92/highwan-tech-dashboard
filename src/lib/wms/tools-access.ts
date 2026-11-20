export const PAYSLIP_ACCOUNT_USERNAME = "ththuy211092@gmail.com";

export function canAccessTools(username: string | null | undefined): boolean {
  return username?.trim().toLowerCase() === PAYSLIP_ACCOUNT_USERNAME;
}
