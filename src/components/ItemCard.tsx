import { Item } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface ItemCardProps {
  item: Item;
  onBorrow?: (item: Item) => void;
}

const ItemCard = ({ item, onBorrow }: ItemCardProps) => {
  const isAvailable = item.status === "Tersedia";
  const [imageLoaded, setImageLoaded] = useState(false);
  const [openDetail, setOpenDetail] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);

  // Lazy load image using Intersection Observer
  useEffect(() => {
    if (!imageRef.current || !item.foto_barang) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Load image when it becomes visible
          if (imageRef.current) {
            imageRef.current.src = item.foto_barang!;
          }
          observer.unobserve(imageRef.current);
        }
      },
      { rootMargin: "50px" } // Start loading 50px before image comes into view
    );

    observer.observe(imageRef.current);

    return () => {
      if (imageRef.current) {
        observer.unobserve(imageRef.current);
      }
    };
  }, [item.foto_barang]);

  const statusDisplay = {
    Tersedia: { label: "Tersedia", variant: "default", color: "bg-success" },
    Dipinjam: { label: "Dipinjam", variant: "secondary", color: "bg-warning" },
    Rusak: { label: "Rusak", variant: "secondary", color: "bg-destructive" },
    Hilang: { label: "Hilang", variant: "secondary", color: "bg-muted" },
  };

  const currentStatus = statusDisplay[item.status];

  return (
    <Card className="relative overflow-hidden group transform-gpu will-change-transform transition-transform duration-300 hover:scale-[1.03] hover:shadow-2xl hover:border-primary/20 hover:z-20 rounded-xl">
      <div className="aspect-video relative overflow-hidden bg-muted">
        {item.foto_barang ? (
          <>
            <img
              ref={imageRef}
              alt={item.nama_barang}
              className={`w-full h-full object-cover group-hover:scale-110 transition-transform duration-300 ease-out ${
                imageLoaded ? "opacity-100" : "opacity-0"
              }`}
              onLoad={() => setImageLoaded(true)}
              loading="lazy"
            />
            {!imageLoaded && (
              <div className="absolute inset-0 bg-muted animate-pulse" />
            )}
            {/* Subtle overlay for readability and polish */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="h-16 w-16 text-muted-foreground/30" />
          </div>
        )}
        <div className="absolute top-2 right-2">
          <Badge
            variant={currentStatus.variant as any}
            className={`${currentStatus.color} shadow-sm backdrop-blur-sm`}
          >
            {currentStatus.label}
          </Badge>
        </div>
      </div>

      <CardContent className="p-4 relative">
        <div className="mb-3 transition-opacity duration-200 group-hover:opacity-0 group-hover:pointer-events-none">
          <h3 className="font-semibold text-lg mb-1 line-clamp-1">
            {item.nama_barang}
          </h3>
          <p className="text-sm text-muted-foreground">
            Kode: {item.kode_barang}
          </p>
        </div>

        {/* Info default (non-hover) */}
        <div className="space-y-2 mb-4 transition-opacity duration-200 group-hover:opacity-0 group-hover:pointer-events-none">
          {item.nama_jenis && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Jenis:</span>
              <span className="font-medium">{item.nama_jenis}</span>
            </div>
          )}
          {item.no_serial_number && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">No. Seri:</span>
              <span className="font-medium text-xs font-mono">
                {item.no_serial_number}
              </span>
            </div>
          )}
          {item.deskripsi_barang && (
            <div className="text-sm text-muted-foreground line-clamp-2">
              {item.deskripsi_barang}
            </div>
          )}
        </div>

        {/* Hover overlay: show only name + actions */}
        <div className="pointer-events-auto hidden group-hover:flex flex-col gap-3 absolute inset-4 transition-all duration-300 ease-out opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0">
          <h3 className="font-semibold text-lg line-clamp-2">
            {item.nama_barang}
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpenDetail(true)}
          >
            Lihat Detail
          </Button>
          <Button
            onClick={() => onBorrow?.(item)}
            disabled={!isAvailable}
            className="w-full"
            size="sm"
          >
            {isAvailable ? "Pinjam Barang" : "Tidak Tersedia"}
          </Button>
        </div>

        {/* Detail Dialog */}
        <Dialog open={openDetail} onOpenChange={setOpenDetail}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="line-clamp-2">{item.nama_barang}</DialogTitle>
              <DialogDescription>Kode: {item.kode_barang}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="w-full">
                {item.foto_barang ? (
                  <img
                    src={item.foto_barang}
                    alt={item.nama_barang}
                    className="w-full max-h-[60vh] object-contain rounded-md border"
                  />
                ) : (
                  <div className="w-full h-64 flex items-center justify-center bg-muted rounded-md border">
                    <Package className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className="font-medium">{item.status}</span>
                </div>
                {item.nama_jenis && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Jenis</span>
                    <span className="font-medium">{item.nama_jenis}</span>
                  </div>
                )}
                {item.kode_jenis && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Kode Jenis</span>
                    <span className="font-medium">{item.kode_jenis}</span>
                  </div>
                )}
                {item.no_serial_number && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">No. Seri</span>
                    <span className="font-medium font-mono">{item.no_serial_number}</span>
                  </div>
                )}
                {typeof item.jumlah_stok !== "undefined" && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Stok</span>
                    <span className="font-medium">{item.jumlah_stok}</span>
                  </div>
                )}
                {typeof item.jumlah_dipinjam !== "undefined" && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sedang Dipinjam</span>
                    <span className="font-medium">{item.jumlah_dipinjam}</span>
                  </div>
                )}
                {item.created_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Dibuat</span>
                    <span className="font-medium">{new Date(item.created_at).toLocaleString()}</span>
                  </div>
                )}
              </div>
              {item.deskripsi_barang && (
                <div className="text-sm">
                  <span className="text-muted-foreground block">Deskripsi</span>
                  <p className="mt-1">{item.deskripsi_barang}</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default ItemCard;
