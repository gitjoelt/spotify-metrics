"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { MONTH_NAMES } from "@/lib/format";

const selectClass =
  "rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm font-medium text-text-primary outline-none transition-colors hover:bg-surface-hover focus:border-accent";

export default function YearMonthFilter({ years }: { years: number[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const year = searchParams.get("year") ?? "";
  const month = searchParams.get("month") ?? "";

  function update(next: { year?: string; month?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    const nextYear = next.year ?? year;
    const nextMonth = next.month ?? month;

    if (nextYear) params.set("year", nextYear);
    else params.delete("year");

    if (nextYear && nextMonth) params.set("month", nextMonth);
    else params.delete("month");

    router.push(`/?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={year}
        onChange={(e) => update({ year: e.target.value, month: "" })}
        className={selectClass}
      >
        <option value="">All time</option>
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>

      {year && (
        <select
          value={month}
          onChange={(e) => update({ month: e.target.value })}
          className={selectClass}
        >
          <option value="">Whole year</option>
          {MONTH_NAMES.map((name, idx) => (
            <option key={name} value={idx + 1}>
              {name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
