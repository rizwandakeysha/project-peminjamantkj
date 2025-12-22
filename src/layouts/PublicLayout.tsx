import { ReactNode, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Calendar, Clock } from "lucide-react";

interface PublicLayoutProps {
  children: ReactNode;
}

const PublicLayout = ({ children }: PublicLayoutProps) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatDate = (date: Date) => {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Oct', 'Nov', 'Des'];
    
    const dayName = days[date.getDay()];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    
    return `${dayName}, ${day} ${month} ${year}`;
  };

  const formatTime = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    
    return `${hours}:${minutes}:${seconds}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/admin-tkj" className="flex items-center gap-3 hover:opacity-90" title="Masuk ke Admin">
              <img
                src="/favicon-32x32.png"
                alt="Logo"
                className="h-10 w-10 rounded-md border border-border object-contain bg-white"
              />
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  SIMABAR: Smart Inventory
                </h1>
                <p className="text-sm text-muted-foreground">Sistem Manajemen Barang</p>
              </div>
            </Link>
            
            <div className="hidden md:flex flex-col items-end gap-1">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Calendar className="h-4 w-4 text-primary" />
                <span>{formatDate(currentTime)}</span>
              </div>
              <div className="flex items-center gap-2 text-lg font-bold text-primary">
                <Clock className="h-4 w-4" />
                <span className="tabular-nums">{formatTime(currentTime)}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto min-h-[65vh] px-4 py-8">
        {children}
      </main>

      <footer className="bg-card border-t border-border mt-16">
        <div className="container mx-auto px-4 py-6">
          <p className="text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} Unit TKJ - Sistem Peminjaman Barang
          </p>
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;
