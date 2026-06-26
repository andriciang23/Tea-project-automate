"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/", label: "Overview", icon: "▦" },
  { href: "/orders", label: "Orders", icon: "🧾" },
  { href: "/inventory", label: "Inventory", icon: "📦" },
  { href: "/products", label: "Products", icon: "🏷️" },
  { href: "/analytics", label: "Analytics", icon: "📈" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="px-6 py-5">
        <div className="text-lg font-bold text-slate-900">Tea Hub</div>
        <div className="text-xs text-slate-400">Unified commerce</div>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {nav.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                active
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-200 px-6 py-4 text-xs text-slate-400">
        Shopify · Shopee · Lazada
      </div>
    </aside>
  );
}
