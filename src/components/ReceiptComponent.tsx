import React from "react";

export type ReceiptItem = {
  nama_barang: string;
  kode_barang: string;
};

export type ReceiptData = {
  kode_peminjaman: string;
  tanggal: string; // already formatted id-ID
  nama_peminjam: string;
  petugas?: string;
  details?: ReceiptItem[];
  items?: ReceiptItem[];
};

function dashedLine(length = 32) {
  return "-".repeat(length);
}

function equalsLine(length = 32) {
  return "=".repeat(length);
}

export const ReceiptComponent = React.forwardRef<HTMLDivElement, { data: ReceiptData }>(
  ({ data }, ref) => {
    const details = data.details ?? data.items ?? [];

    return (
      <div ref={ref} className="receipt58">
        <div className="receipt58__center">
          <div className="receipt58__title">SIMABAR SMART-INV</div>
          <div className="receipt58__subtitle">SMKN 5 MALANG</div>
        </div>

        <div className="receipt58__divider">{equalsLine()}</div>

        <div style={{ fontSize: "9pt" }}>
          <div>
            ID&nbsp;&nbsp;&nbsp;: <span className="receipt58__mono">{data.kode_peminjaman}</span>
          </div>
          <div>Tgl&nbsp;&nbsp;: {data.tanggal}</div>
          <div>User : {data.nama_peminjam}</div>
          {data.petugas ? <div>Petg : {data.petugas}</div> : null}
        </div>

        <div className="receipt58__divider">{dashedLine()}</div>

        <div style={{ fontWeight: 700, marginBottom: 5 }}>DAFTAR BARANG:</div>
        <div className="receipt58__items">
          {details.map((item, idx) => (
            <div key={`${item.kode_barang}-${idx}`} className="receipt58__item">
              <div className="receipt58__itemName">
                {idx + 1}. {item.nama_barang}
              </div>
              <div className="receipt58__mono">&nbsp;&nbsp;[{item.kode_barang}]</div>
            </div>
          ))}
        </div>

        <div className="receipt58__divider">{dashedLine()}</div>

        <div style={{ fontSize: "8pt", textAlign: "center" }}>
          * BARANG WAJIB KEMBALI UTUH
          <br />
          * KERUSAKAN = GANTI RUGI
        </div>

        <div className="receipt58__spacer" />

        <div style={{ marginTop: 20, textAlign: "center" }}>
          Tanda Tangan
          <br />
          <br />
          <br />
          (................)
        </div>

        <div className="receipt58__divider">{equalsLine()}</div>

        <div style={{ textAlign: "center", fontSize: "9pt" }}>Terima Kasih!</div>
      </div>
    );
  }
);

ReceiptComponent.displayName = "ReceiptComponent";
