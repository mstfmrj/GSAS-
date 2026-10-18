"use client";

import React, { useMemo } from "react";
import { MONTH_OPTIONS } from "@/lib/dateFilterHelper";

interface ProjectDateFilterProps {
  year: string;
  month: string;
  day: string;
  onChange: (filters: { year: string; month: string; day: string }) => void;
  years?: number[];
  disabled?: boolean;
}

export default function ProjectDateFilter({
  year,
  month,
  day,
  onChange,
  years,
  disabled = false,
}: ProjectDateFilterProps) {
  // Default year list: current year + 2 down to 2015
  const yearOptions = useMemo(() => {
    if (years && years.length > 0) return years;
    const current = new Date().getFullYear();
    const startYear = Math.max(current + 2, 2026);
    const list: number[] = [];
    for (let y = startYear; y >= 2015; y--) {
      list.push(y);
    }
    return list;
  }, [years]);

  // Compute days in currently selected month and year
  const daysInMonth = useMemo(() => {
    if (!month) return 31;
    const m = parseInt(month, 10);
    const y = year ? parseInt(year, 10) : 2024; // leap-year fallback if no year
    return new Date(y, m, 0).getDate();
  }, [year, month]);

  const handleYearChange = (newYear: string) => {
    if (!newYear) {
      // Clearing year clears month and day
      onChange({ year: "", month: "", day: "" });
    } else {
      // If month is set and day exceeds daysInMonth of the new year (e.g. Feb 29 on non-leap year)
      let adjustedDay = day;
      if (month && day) {
        const dNum = parseInt(day, 10);
        const mNum = parseInt(month, 10);
        const maxDays = new Date(parseInt(newYear, 10), mNum, 0).getDate();
        if (dNum > maxDays) {
          adjustedDay = String(maxDays);
        }
      }
      onChange({ year: newYear, month, day: adjustedDay });
    }
  };

  const handleMonthChange = (newMonth: string) => {
    if (!newMonth) {
      // Clearing month clears day
      onChange({ year, month: "", day: "" });
    } else {
      // Adjust day if exceeds days in new month
      let adjustedDay = day;
      if (day) {
        const dNum = parseInt(day, 10);
        const mNum = parseInt(newMonth, 10);
        const yNum = year ? parseInt(year, 10) : 2024;
        const maxDays = new Date(yNum, mNum, 0).getDate();
        if (dNum > maxDays) {
          adjustedDay = String(maxDays);
        }
      }
      onChange({ year, month: newMonth, day: adjustedDay });
    }
  };

  const handleDayChange = (newDay: string) => {
    onChange({ year, month, day: newDay });
  };

  const handleClear = () => {
    onChange({ year: "", month: "", day: "" });
  };

  const hasFilter = Boolean(year || month || day);

  return (
    <div className="d-flex align-items-center gap-1 flex-wrap">
      {/* Year Dropdown */}
      <div style={{ minWidth: 105 }}>
        <select
          className="form-select form-select-sm"
          value={year}
          onChange={(e) => handleYearChange(e.target.value)}
          disabled={disabled}
          title="Filter by Year"
        >
          <option value="">Year: All</option>
          {yearOptions.map((y) => (
            <option key={y} value={String(y)}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {/* Month Dropdown (enabled only when Year is selected) */}
      <div style={{ minWidth: 115 }}>
        <select
          className="form-select form-select-sm"
          value={month}
          onChange={(e) => handleMonthChange(e.target.value)}
          disabled={disabled || !year}
          title={!year ? "Select a Year first to filter by month" : "Filter by Month"}
        >
          <option value="">Month: All</option>
          {MONTH_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Day Dropdown (enabled only when Month is selected) */}
      <div style={{ minWidth: 95 }}>
        <select
          className="form-select form-select-sm"
          value={day}
          onChange={(e) => handleDayChange(e.target.value)}
          disabled={disabled || !month}
          title={!month ? "Select a Month first to filter by date" : "Filter by Day"}
        >
          <option value="">Day: All</option>
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
            <option key={d} value={String(d)}>
              {d}
            </option>
          ))}
        </select>
      </div>

      {/* Clear Date Filters Button */}
      {hasFilter && (
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary px-2"
          onClick={handleClear}
          title="Clear date filter"
          disabled={disabled}
        >
          <i className="bi bi-x"></i>
        </button>
      )}
    </div>
  );
}
