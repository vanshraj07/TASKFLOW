import React, { useState, useMemo } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  isToday,
} from "date-fns";

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export function Calendar({ mode = "single", selected, onSelect, initialFocus }) {
  const [viewDate, setViewDate] = useState(() => {
    if (selected instanceof Date) return selected;
    return new Date();
  });

  const weeks = useMemo(() => {
    const monthStart = startOfMonth(viewDate);
    const monthEnd = endOfMonth(viewDate);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    const days = eachDayOfInterval({ start: calStart, end: calEnd });

    const result = [];
    for (let i = 0; i < days.length; i += 7) {
      result.push(days.slice(i, i + 7));
    }
    return result;
  }, [viewDate]);

  const prevMonth = () => setViewDate((d) => subMonths(d, 1));
  const nextMonth = () => setViewDate((d) => addMonths(d, 1));

  return (
    <div className="p-3 bg-white select-none" style={{ minWidth: 260 }}>
      {/* Header: < Month Year > */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={prevMonth}
          className="w-8 h-8 flex items-center justify-center border border-neutral-900 hover:bg-neutral-100 text-sm font-bold"
        >
          ‹
        </button>
        <span className="font-display font-bold text-sm tracking-tight">
          {format(viewDate, "MMMM yyyy")}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="w-8 h-8 flex items-center justify-center border border-neutral-900 hover:bg-neutral-100 text-sm font-bold"
        >
          ›
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map((d) => (
          <div
            key={d}
            className="text-center text-[10px] font-bold uppercase text-neutral-500 py-1"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7">
          {week.map((day) => {
            const inMonth = isSameMonth(day, viewDate);
            const isSelected = selected && isSameDay(day, selected);
            const today = isToday(day);

            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => onSelect?.(day)}
                className={`
                  w-full aspect-square flex items-center justify-center text-sm
                  transition-colors duration-100
                  ${!inMonth ? "text-neutral-300" : "text-neutral-900"}
                  ${isSelected
                    ? "bg-[#FF4500] text-white font-bold"
                    : today && inMonth
                      ? "border border-neutral-900 font-semibold"
                      : "hover:bg-neutral-100"
                  }
                `}
              >
                {format(day, "d")}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
