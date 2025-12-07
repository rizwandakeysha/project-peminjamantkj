import { Item } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface ItemCardProps {
  item: Item;
  onBorrow?: (item: Item) => void;
}

const ItemCard = ({ item, onBorrow }: ItemCardProps) => {
  const isAvailable = item.status === "Tersedia";
  const [imageLoaded, setImageLoaded] = useState(false);
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
    <Card className="overflow-hidden hover:shadow-custom-lg transition-all duration-300 group">
      <div className="aspect-video relative overflow-hidden bg-muted">
        {item.foto_barang ? (
          <>
            <img
              ref={imageRef}
              alt={item.nama_barang}
              className={`w-full h-full object-cover group-hover:scale-105 transition-all duration-300 ${
                imageLoaded ? "opacity-100" : "opacity-0"
              }`}
              onLoad={() => setImageLoaded(true)}
              loading="lazy"
            />
            {!imageLoaded && (
              <div className="absolute inset-0 bg-muted animate-pulse" />
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="h-16 w-16 text-muted-foreground/30" />
          </div>
        )}
        <div className="absolute top-2 right-2">
          <Badge
            variant={currentStatus.variant as any}
            className={currentStatus.color}
          >
            {currentStatus.label}
          </Badge>
        </div>
      </div>

      <CardContent className="p-4">
        <div className="mb-3">
          <h3 className="font-semibold text-lg mb-1 line-clamp-1">
            {item.nama_barang}
          </h3>
          <p className="text-sm text-muted-foreground">
            Kode: {item.kode_barang}
          </p>
        </div>

        <div className="space-y-2 mb-4">
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

        <Button
          onClick={() => onBorrow?.(item)}
          disabled={!isAvailable}
          className="w-full"
          size="sm"
        >
          {isAvailable ? "Pinjam Barang" : "Tidak Tersedia"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default ItemCard;
