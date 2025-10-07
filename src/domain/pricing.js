export const ROOM_BASE_RATES = { junior: 60, king: 90, presidential: 150 };

function parseUtcYmd(input) {
  if (input instanceof Date) return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()));
  // If string like YYYY-MM-DD, construct UTC midnight
  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const [y, m, d] = input.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d));
  }
  const d = new Date(input);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function isWeekend(date) {
  const d = parseUtcYmd(date).getUTCDay();
  return d === 0 || d === 6; // Sunday(0) or Saturday(6)
}

export function calculatePriceCents({ roomType, checkIn, checkOut, numGuests, includeBreakfast }) {
  const base = ROOM_BASE_RATES[roomType];
  if (!base) throw new Error('INVALID_ROOM_TYPE');

  const start = parseUtcYmd(checkIn);
  const end = parseUtcYmd(checkOut);
  if (!(start < end)) throw new Error('INVALID_DATES');

  const msPerDay = 24 * 60 * 60 * 1000;
  const days = Math.ceil((end.getTime() - start.getTime()) / msPerDay);

  let perDay = base;
  if (days >= 10) perDay -= 12;
  else if (days >= 7) perDay -= 8;
  else if (days >= 4) perDay -= 4;

  let total = 0;
  const breakdown = [];

  for (let i = 0; i < days; i++) {
    const day = new Date(start.getTime() + i * msPerDay);
    let dayPrice = perDay;
    if (isWeekend(day)) dayPrice = Math.round(dayPrice * 1.25);

    const breakfastCents = includeBreakfast ? 5 * 100 * numGuests : 0;
    const dayCents = dayPrice * 100 + breakfastCents;

    // Format date as YYYY-MM-DD from UTC components
    const y = day.getUTCFullYear();
    const m = String(day.getUTCMonth() + 1).padStart(2, '0');
    const d = String(day.getUTCDate()).padStart(2, '0');
    breakdown.push({ date: `${y}-${m}-${d}`, baseCents: dayPrice * 100, breakfastCents });
    total += dayCents;
  }

  return { totalCents: total, days, perDayFinalCents: perDay * 100, breakdown };
}
