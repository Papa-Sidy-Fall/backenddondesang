const CNI_REGEX = /^[0-9A-Z]{13}$/;

export function normalizeCni(input: string): string {
  return input.replace(/\s+/g, "").toUpperCase();
}

export function isValidCni(input: string): boolean {
  return CNI_REGEX.test(input);
}

export function normalizeSenegalPhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");

  if (digits.length === 9) {
    return `+221${digits}`;
  }

  if (digits.length === 12 && digits.startsWith("221")) {
    return `+${digits}`;
  }

  return null;
}
