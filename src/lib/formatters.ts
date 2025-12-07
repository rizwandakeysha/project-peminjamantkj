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
