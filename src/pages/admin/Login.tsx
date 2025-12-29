import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import PublicLayout from "@/layouts/PublicLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Eye, EyeOff, Home, Lock, LogIn } from "lucide-react";
import { setAdminToken, setAdminInfo } from "@/lib/auth";
import { adminAPI } from "@/lib/api";
import { toast } from "react-hot-toast";

const AdminLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (!username.trim() || !password.trim()) {
        toast.error("Username dan password harus diisi");
        setLoading(false);
        return;
      }

      // Call login API
      const response = await adminAPI.login(username, password);

      if (response && response.token) {
        // Save token to localStorage
        setAdminToken(response.token);

        // Save admin info
        setAdminInfo(response.admin);

        toast.success(
          `Login berhasil! Selamat datang ${response.admin.nama_lengkap}`
        );

        const redirectTo =
          (location.state as any)?.from || "/admin-tkj/dashboard";
        navigate(redirectTo, { replace: true });
      }
    } catch (err: any) {
      const errorMessage = err?.message || "Terjadi kesalahan saat login";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      <div className="max-w-md mx-auto">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link to="/">
            <Home className="h-4 w-4 mr-2" />
            Ke Beranda
          </Link>
        </Button>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              Login Admin
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  placeholder="Masukkan username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                  autoFocus
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Masukkan password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2"
                    onClick={() => setShowPassword((v) => !v)}
                    disabled={loading}
                    aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {error && (
                <Alert className="bg-red-50 border-red-200">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-900 text-sm">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                <LogIn className="h-4 w-4 mr-2" />
                {loading ? "Masuk..." : "Masuk"}
              </Button>
            </form>

            <Alert className="mt-4 bg-blue-50 border-blue-200">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-900 text-xs">
                <strong>Info:</strong> Silakan masukkan username dan password
                yang terdaftar di database
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </PublicLayout>
  );
};

export default AdminLogin;
