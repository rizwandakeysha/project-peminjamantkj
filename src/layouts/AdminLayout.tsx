import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Package, ClipboardList, Home, LogOut, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { clearAdminToken, parseAdminToken } from "@/lib/auth";
import { toast } from "react-hot-toast";

interface AdminLayoutProps {
  children: ReactNode;
}

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [adminName, setAdminName] = useState<string>("Admin");
  const [inactivityOpen, setInactivityOpen] = useState(false);

  const IDLE_MS = useMemo(() => 15 * 60 * 1000, []);
  const PROMPT_MS = useMemo(() => 2 * 60 * 1000, []);

  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const promptTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const token = parseAdminToken();
    if (token && token.nama_lengkap) {
      setAdminName(token.nama_lengkap);
    }
  }, []);

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const handleLogout = () => {
    clearAdminToken();
    toast.success("Logout berhasil");
    navigate("/admin-tkj/login", { replace: true });
  };

  const clearTimers = () => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    if (promptTimerRef.current) {
      clearTimeout(promptTimerRef.current);
      promptTimerRef.current = null;
    }
  };

  const resetIdleTimer = () => {
    if (inactivityOpen) return;
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      setInactivityOpen(true);
    }, IDLE_MS);
  };

  useEffect(() => {
    resetIdleTimer();

    const onActivity = () => resetIdleTimer();
    const events: Array<keyof WindowEventMap> = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
    ];

    for (const event of events) {
      window.addEventListener(event, onActivity, { passive: true });
    }

    return () => {
      for (const event of events) {
        window.removeEventListener(event, onActivity);
      }
      clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [IDLE_MS, inactivityOpen]);

  useEffect(() => {
    if (!inactivityOpen) {
      if (promptTimerRef.current) {
        clearTimeout(promptTimerRef.current);
        promptTimerRef.current = null;
      }
      return;
    }

    if (promptTimerRef.current) clearTimeout(promptTimerRef.current);
    promptTimerRef.current = setTimeout(() => {
      setInactivityOpen(false);
      clearAdminToken();
      toast.error("Logout otomatis karena tidak ada aktivitas");
      navigate("/admin-tkj/login", { replace: true });
    }, PROMPT_MS);

    return () => {
      if (promptTimerRef.current) {
        clearTimeout(promptTimerRef.current);
        promptTimerRef.current = null;
      }
    };
  }, [PROMPT_MS, inactivityOpen, navigate]);

  const handleStillHere = () => {
    setInactivityOpen(false);
    resetIdleTimer();
  };

  return (
    <div className="min-h-screen bg-background">
      <Dialog open={inactivityOpen}>
        <DialogContent
          onEscapeKeyDown={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Anda masih di sana?</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground">
            Tidak ada aktivitas selama 15 menit. Klik tombol di bawah dalam 2 menit untuk tetap login.
          </div>
          <div className="flex gap-2 justify-end">
            <Button onClick={handleStillHere}>Ya, saya di sini</Button>
          </div>
        </DialogContent>
      </Dialog>

      <header className="bg-card border-b border-border shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="/favicon-32x32.png"
                alt="Logo"
                className="h-10 w-10 rounded-md border border-border object-contain bg-white"
              />
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  Dashboard Admin 
                </h1>
                <p className="text-sm text-muted-foreground">SIMABAR Smart Inventory</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-sm text-muted-foreground">
                Selamat datang,{" "}
                <span className="font-medium text-foreground">{adminName}</span>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/">
                  <Home className="h-4 w-4 mr-2" />
                  Beranda
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <nav className="flex gap-2 mb-6 bg-card p-2 rounded-lg border border-border shadow-sm">
          <Button
            variant={isActive("/admin-tkj/dashboard") ? "default" : "ghost"}
            size="sm"
            asChild
          >
            <Link to="/admin-tkj/dashboard">
              <Home className="h-4 w-4 mr-2" />
              Dashboard
            </Link>
          </Button>
          <Button
            variant={isActive("/admin-tkj/items") ? "default" : "ghost"}
            size="sm"
            asChild
          >
            <Link to="/admin-tkj/items">
              <Package className="h-4 w-4 mr-2" />
              Barang
            </Link>
          </Button>
          <Button
            variant={isActive("/admin-tkj/borrowings") ? "default" : "ghost"}
            size="sm"
            asChild
          >
            <Link to="/admin-tkj/borrowings">
              <ClipboardList className="h-4 w-4 mr-2" />
              Peminjaman
            </Link>
          </Button>
          <Button
            variant={isActive("/admin-tkj/users") ? "default" : "ghost"}
            size="sm"
            asChild
          >
            <Link to="/admin-tkj/users">
              <Users className="h-4 w-4 mr-2" />
              Pengguna
            </Link>
          </Button>
        </nav>

        <main>{children}</main>
      </div>
    </div>
  );
};

export default AdminLayout;
