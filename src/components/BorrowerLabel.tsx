import React from "react";

type Props = {
  label: string;
  role?: "guru" | "siswa";
  className?: string;
};

// Renders a borrower label previously formatted as a single string.
// For students the expected format is: "Name – NIS – Kelas" (en-dash separators)
// For teachers the expected format is: "Name - NIP" (hyphen separator)
export const BorrowerLabel = ({ label, role = "guru", className = "" }: Props) => {
  if (!label) return <span className={className}>-</span>;

  if (role === "siswa") {
    const parts = label.split(" – ");
    const name = parts[0] ?? label;
    const nis = parts[1] ?? "";
    const kelas = parts[2] ?? "";

    return (
      <div className={className}>
        <div className="font-medium text-sm">{name}</div>
        <div className="text-xs text-muted-foreground">{nis}{nis && kelas ? ` — ${kelas}` : kelas}</div>
      </div>
    );
  }

  // guru
  const parts = label.split(" - ");
  const name = parts[0] ?? label;
  const nip = parts[1] ?? "";

  return (
    <div className={className}>
      <div className="font-medium text-sm">{name}</div>
      <div className="text-xs text-muted-foreground">{nip}</div>
    </div>
  );
};

export default BorrowerLabel;
