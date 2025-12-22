-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.admin (
  id_admin integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  username character varying NOT NULL UNIQUE,
  password character varying NOT NULL,
  nama_lengkap character varying NOT NULL,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT admin_pkey PRIMARY KEY (id_admin)
);
CREATE TABLE public.barang (
  id_barang integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_jenis_barang integer NOT NULL,
  kode_barang character varying NOT NULL UNIQUE,
  nama_barang character varying NOT NULL,
  foto_barang character varying,
  no_serial_number character varying UNIQUE,
  deskripsi_barang text,
  status character varying DEFAULT 'Tersedia'::character varying CHECK (status::text = ANY (ARRAY['Tersedia'::character varying::text, 'Dipinjam'::character varying::text, 'Rusak'::character varying::text, 'Hilang'::character varying::text])),
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT barang_pkey PRIMARY KEY (id_barang),
  CONSTRAINT fk_jenis_barang FOREIGN KEY (id_jenis_barang) REFERENCES public.jenis_barang(id_jenis_barang)
);
CREATE TABLE public.detail_peminjaman (
  id_detail_peminjaman integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_peminjaman integer NOT NULL,
  id_barang integer,
  tanggal_kembali timestamp without time zone,
  foto_bukti_kembali text,
  status character varying DEFAULT 'Dipinjam'::character varying CHECK (status::text = ANY (ARRAY['Dipinjam'::character varying::text, 'Dikembalikan'::character varying::text, 'Rusak'::character varying::text, 'Hilang'::character varying::text])),
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT detail_peminjaman_pkey PRIMARY KEY (id_detail_peminjaman),
  CONSTRAINT fk_barang_item FOREIGN KEY (id_barang) REFERENCES public.barang(id_barang),
  CONSTRAINT fk_peminjaman_header FOREIGN KEY (id_peminjaman) REFERENCES public.peminjaman(id_peminjaman),
  CONSTRAINT detail_peminjaman_id_barang_fkey FOREIGN KEY (id_barang) REFERENCES public.barang(id_barang)
);
CREATE TABLE public.guru (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nama_guru character varying DEFAULT ''::character varying,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  nip text,
  CONSTRAINT guru_pkey PRIMARY KEY (id)
);
CREATE TABLE public.jenis_barang (
  id_jenis_barang integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  kode_jenis_barang character varying NOT NULL UNIQUE,
  nama_jenis_barang character varying NOT NULL,
  deskripsi_jenis_barang text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT jenis_barang_pkey PRIMARY KEY (id_jenis_barang)
);
CREATE TABLE public.peminjaman (
  id_peminjaman integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  kode_peminjaman character varying NOT NULL UNIQUE,
  nama_peminjam character varying NOT NULL,
  kontak character varying,
  keperluan text NOT NULL,
  guru_pendamping character varying NOT NULL,
  tanggal_pinjam timestamp with time zone,
  foto_credential text,
  signature text,
  status_transaksi character varying DEFAULT 'Dipinjam'::character varying CHECK (status_transaksi::text = ANY (ARRAY['Dipinjam'::character varying::text, 'Sebagian Dikembalikan'::character varying::text, 'Selesai'::character varying::text])),
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT peminjaman_pkey PRIMARY KEY (id_peminjaman)
);
CREATE TABLE public.siswa (
  id_siswa bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nama_siswa character varying DEFAULT ''::character varying,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  nis text,
  kelas text,
  CONSTRAINT siswa_pkey PRIMARY KEY (id_siswa)
);