import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PublicLayout from "@/layouts/PublicLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Lock, LogIn } from "lucide-react";
import { setAdminToken } from "@/lib/auth";
import { toast } from "react-hot-toast";

const AdminLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // DUMMY MODE: Accept any username & password
      if (username.trim() && password.trim()) {
        // Generate dummy token
        const dummyToken = `dummy-token-${Date.now()}`;
        setAdminToken(dummyToken);
        toast.success("Login berhasil! (Dummy Mode)");

        const redirectTo =
          (location.state as any)?.from || "/admin-tkj/dashboard";
        navigate(redirectTo, { replace: true });
      } else {
        toast.error("Username dan password harus diisi");
      }
    } catch (err: any) {
      toast.error("Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      <div className="max-w-md mx-auto">
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
                  placeholder="Masukkan username apapun"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Masukkan password apapun"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                <LogIn className="h-4 w-4 mr-2" />
                {loading ? "Masuk..." : "Masuk"}
              </Button>
            </form>

            {/* Dummy Mode Info */}
            <Alert className="mt-4 bg-blue-50 border-blue-200">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-900 text-xs">
                <strong>Mode Demo:</strong> Terima semua username & password (untuk testing)
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </PublicLayout>
  );
};

export default AdminLogin;
