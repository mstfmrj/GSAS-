/**
 * src/lib/dateFilterHelper.ts
 *
 * PURPOSE:
 * Utility for parsing dates, constructing SQL WHERE conditions for date filtering (Year, Year+Month, Year+Month+Day),
 * and supporting date dropdown options across projects.
 */

export const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
] as const;

export const MONTH_OPTIONS = [
  { value: "01", label: "01 - Jan" },
  { value: "02", label: "02 - Feb" },
  { value: "03", label: "03 - Mar" },
  { value: "04", label: "04 - Apr" },
  { value: "05", label: "05 - May" },
  { value: "06", label: "06 - Jun" },
  { value: "07", label: "07 - Jul" },
  { value: "08", label: "08 - Aug" },
  { value: "09", label: "09 - Sep" },
  { value: "10", label: "10 - Oct" },
  { value: "11", label: "11 - Nov" },
  { value: "12", label: "12 - Dec" },
];

/**
 * Builds and applies SQL WHERE conditions for filtering by Year, Year+Month, or Year+Month+Day.
 */
export function applyDateFilter(
  conditions: string[],
  params: any[],
  dateColumn: string,
  year?: string,
  month?: string,
  day?: string,
  yearColumn?: string
): void {
  if (!year && !month && !day) return;

  const y = year ? String(year).trim() : "";
  const m = month ? String(month).trim() : "";
  const d = day ? String(day).trim() : "";

  if (y) {
    const y4 = y.length === 2 ? "20" + y : y;
    const y2 = y4.slice(-2);

    let mNum = "";
    let mName = "";
    if (m) {
      const pM = parseInt(m, 10);
      if (!isNaN(pM) && pM >= 1 && pM <= 12) {
        mNum = String(pM).padStart(2, "0");
        mName = MONTH_NAMES[pM - 1];
      } else {
        const found = MONTH_NAMES.findIndex(
          (name) => name.toLowerCase() === m.slice(0, 3).toLowerCase()
        );
        if (found !== -1) {
          mNum = String(found + 1).padStart(2, "0");
          mName = MONTH_NAMES[found];
        }
      }
    }

    let dNum = "";
    if (d) {
      const pD = parseInt(d, 10);
      if (!isNaN(pD) && pD >= 1 && pD <= 31) {
        dNum = String(pD);
      }
    }

    // Case 1: Year + Month + Day
    if (mName && dNum) {
      const regex = `(^0?${dNum}([-/ ])(${mName}|${mNum}|0?${parseInt(mNum, 10)})([-/ ])(${y4}|${y2})$|^${y4}([-/ ])(${mName}|${mNum}|0?${parseInt(mNum, 10)})([-/ ])0?${dNum}$)`;
      params.push(regex);
      conditions.push(`${dateColumn} ~* $${params.length}`);
      return;
    }

    // Case 2: Year + Month
    if (mName) {
      const regex = `(([-/ ])(${mName}|${mNum}|0?${parseInt(mNum, 10)})([-/ ])(${y4}|${y2})$|^${y4}([-/ ])(${mName}|${mNum}|0?${parseInt(mNum, 10)})([-/ ]))`;
      params.push(regex);
      conditions.push(`${dateColumn} ~* $${params.length}`);
      return;
    }

    // Case 3: Year only
    const regex = `(([-/ ])(${y4}|${y2})$|^${y4}([-/ ]))`;
    if (yearColumn) {
      params.push(y4);
      const p1 = params.length;
      params.push(regex);
      const p2 = params.length;
      conditions.push(`(${yearColumn} = $${p1} OR ${dateColumn} ~* $${p2})`);
    } else {
      params.push(regex);
      conditions.push(`${dateColumn} ~* $${params.length}`);
    }
  }
}
