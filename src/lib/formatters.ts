export const formatTeacherDisplay = (t: { name: string; nip?: string }) => {
  return `${t.name} - ${t.nip ?? ""}`.trim();
};

export const formatStudentDisplay = (s: { name: string; nis?: string; kelas?: string }) => {
  // Use en-dash for student display as used in BorrowFlow UI
  return `${s.name} – ${s.nis ?? ""} – ${s.kelas ?? ""}`.trim();
};

export const formatBorrowerDisplay = (
  person: any,
  role: "guru" | "siswa"
) => {
  return role === "guru" ? formatTeacherDisplay(person) : formatStudentDisplay(person);
};

// Format tanggal dengan timezone lokal (Indonesia)
export const formatDateTimeLocal = (dateStr: string | Date) => {
  if (!dateStr) return "-";
  try {
    // Jika string dari database, parse dulu sebagai ISO string
    const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
    // Format dengan locale id-ID untuk timezone Indonesia
    return new Intl.DateTimeFormat("id-ID", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(date);
  } catch (e) {
    return "-";
  }
};

// Format hanya tanggal (tidak jam)
export const formatDateLocal = (dateStr: string | Date) => {
  if (!dateStr) return "-";
  try {
    const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
    return new Intl.DateTimeFormat("id-ID", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch (e) {
    return "-";
  }
};
