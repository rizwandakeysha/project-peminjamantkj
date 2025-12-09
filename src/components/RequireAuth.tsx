import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getAdminToken } from "@/lib/auth";
import { adminAPI } from "@/lib/api";

const RequireAuth = ({ children }: { children: JSX.Element }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const check = async () => {
      try {
        const token = getAdminToken();
        if (!token) throw new Error("no-token");

        // Validate token by calling getProfile endpoint
        const profile = await adminAPI.getProfile(token);

        if (!profile) throw new Error("invalid-token");

        // Token is valid, allow access
        setChecking(false);
      } catch (error) {
        // Token is invalid or not found
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
