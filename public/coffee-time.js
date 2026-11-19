export const TIME_ZONE = "Asia/Ho_Chi_Minh";
export const PERIODS = {
  morning: { name: "Sáng", greeting: "Chào buổi sáng", label: "V60 BLOOM • 92°C", light: 0xffe2ad, coffee: 0x6b270b, exposure: 1.12 },
  afternoon: { name: "Chiều", greeting: "Chào buổi chiều", label: "POUR-OVER • 1:15", light: 0xffc781, coffee: 0x54200b, exposure: 1.02 },
  evening: { name: "Tối", greeting: "Chào buổi tối", label: "ROASTERY • 90°C", light: 0xffb774, coffee: 0x4d210d, exposure: 0.88 },
};
const timeFormat = new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
const dateFormat = new Intl.DateTimeFormat("vi-VN", { timeZone: TIME_ZONE, weekday: "long", day: "numeric", month: "long", year: "numeric" });
export function periodForHour(hour) {
  return hour >= 5 && hour < 12 ? "morning" : hour >= 12 && hour < 18 ? "afternoon" : "evening";
}
export function clockAt(date = new Date()) {
  const time = timeFormat.format(date);
  return { time, date: dateFormat.format(date), period: periodForHour(Number(time.slice(0, 2))) };
}
