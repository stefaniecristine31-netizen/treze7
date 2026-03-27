import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { useLoja } from '@/hooks/useLoja';
import { Loader2, Lock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface Props {
  children: React.ReactNode;
  adminOnly?: boolean;
  superAdminOnly?: boolean;
}

export function ProtectedRoute({ children, adminOnly = false, superAdminOnly = false }: Props) {
  const { user, loading } = useAuth();
  const { isAdmin, isSuperAdmin, loading: roleLoading } = useRole();
  const { loja, loading: lojaLoading } = useLoja();

  if (loading || roleLoading || lojaLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (superAdminOnly && !isSuperAdmin) return <Navigate to="/" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/vendas" replace />;

  // Payment/status block (not for super admins)
  if (!isSuperAdmin && loja && (loja.pagamento === 'pendente' || loja.status === 'bloqueado')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full shadow-card border-destructive/30">
          <CardContent className="p-8 text-center space-y-4">
            <Lock className="h-16 w-16 mx-auto text-destructive" />
            <h2 className="text-xl font-bold">Acesso Bloqueado</h2>
            <p className="text-muted-foreground">
              Seu acesso está temporariamente bloqueado. Entre em contato com o suporte para regularizar sua situação.
            </p>
            <p className="text-sm text-muted-foreground">
              📧 suporte@treze7.com.br
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
