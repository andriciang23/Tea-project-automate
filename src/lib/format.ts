export function money(amount: number, currency = "SGD") {
  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function shortDate(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-SG", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function statusColor(status: string) {
  switch (status) {
    case "paid":
      return "bg-blue-100 text-blue-700";
    case "fulfilled":
      return "bg-green-100 text-green-700";
    case "cancelled":
      return "bg-slate-200 text-slate-600";
    case "refunded":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-yellow-100 text-yellow-700";
  }
}
