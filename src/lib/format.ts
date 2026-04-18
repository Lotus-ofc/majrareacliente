export function formatBRL(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

export function formatDateBR(iso: string): string {
  // iso may be "YYYY-MM-DD"
  const [y, m, d] = iso.split("-");
  if (y && m && d) return `${d}/${m}/${y}`;
  return new Date(iso).toLocaleDateString("pt-BR");
}

export function formatMonthLabel(ref: string): string {
  // ref: "YYYY-MM"
  const [y, m] = ref.split("-").map(Number);
  if (!y || !m) return ref;
  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];
  return `${months[m - 1]} / ${y}`;
}

export function isOverdue(dueIso: string): boolean {
  const due = new Date(dueIso + "T23:59:59");
  return due.getTime() < Date.now();
}
