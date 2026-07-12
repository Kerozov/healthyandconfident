export function formatMeetingLabel(meetingId: string): string {
  if (meetingId === "unknown") return "Неизвестна среща";
  if (meetingId.length <= 12) return meetingId;
  return `…${meetingId.slice(-10)}`;
}
