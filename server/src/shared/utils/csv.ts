/**
 * Sanitize string value against CSV Formula Injection (DDE injection).
 * Characters =, +, -, @, tab, or carriage return at the start of a field
 * are escaped with a leading single quote.
 */
export function sanitizeCsvField(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value).trim();
  const dangerousPrefixes = ['=', '+', '-', '@', '\t', '\r'];

  if (dangerousPrefixes.some((prefix) => str.startsWith(prefix))) {
    return `'${str}`;
  }

  return str;
}

export function formatCsvRow(fields: unknown[]): string {
  return fields
    .map((field) => {
      const sanitized = sanitizeCsvField(field);
      // Escape inner quotes
      const escaped = sanitized.replace(/"/g, '""');
      return `"${escaped}"`;
    })
    .join(',');
}
