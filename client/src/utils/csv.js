// Quote a value when it contains a comma, quote or line break (RFC 4180); inner quotes are doubled
const escapeCell = (value) => {
  if (value == null) return '';
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

// rows: array of arrays of cell values
export const toCsv = (rows) => rows.map((row) => row.map(escapeCell).join(',')).join('\r\n');

export const downloadCsv = (filename, csv) => {
  // BOM so Excel opens accented names (French) as UTF-8
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoke on the next tick; some browsers cancel the download if it's revoked synchronously
  setTimeout(() => URL.revokeObjectURL(url), 0);
};
