import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getAdminToken } from "@/lib/auth";

const RequireAuth = ({ children }: { children: JSX.Element }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const check = async () => {
      try {
        const token = getAdminToken();
        // DUMMY MODE: Just check if token exists, no API call
        if (!token) throw new Error("no-token");
        
        // Token exists, allow access
        setChecking(false);
      } catch {
        navigate("/admin-tkj/login", {
          replace: true,
          state: { from: location.pathname },
        });
      }
    };
    check();
  }, [navigate, location.pathname]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Memeriksa sesi admin...
      </div>
    );
  }

  return children;
};

export default RequireAuth;
