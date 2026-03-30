import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { useLoja } from '@/hooks/useLoja';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Upload, Trash2, Save, Store, Users, ShieldCheck, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function Configuracoes() {
  const { user } = useAuth();
  const { isAdmin } = useRole();
  const { lojaId } = useLoja();
  const [nomeLoja, setNomeLoja] = useState('Treze7');
  const [telefoneLoja, setTelefoneLoja] = useState('');
  const [enderecoLoja, setEnderecoLoja] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [configId, setConfigId] = useState<string | null>(null);

  // User management
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [roles, setRoles] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user || !lojaId) return;
    const load = async () => {
      const { data } = await supabase.from('configuracoes').select('*').eq('loja_id', lojaId).maybeSingle();
      if (data) {
        setConfigId(data.id);
        setNomeLoja(data.nome_loja || 'Treze7');
        setTelefoneLoja(data.telefone_loja || '');
        setEnderecoLoja(data.endereco_loja || '');
        setLogoUrl(data.logo_url || null);
      }

      if (isAdmin) {
        const { data: profiles } = await supabase.from('profiles').select('*').eq('loja_id', lojaId);
        setUsuarios(profiles || []);
        const { data: userRoles } = await supabase.from('user_roles').select('*');
        const rolesMap: Record<string, string> = {};
        (userRoles || []).forEach((r: any) => { rolesMap[r.user_id] = r.role; });
        setRoles(rolesMap);
      }
    };
    load();
  }, [user, lojaId, isAdmin]);

  const uploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${lojaId || user.id}/logo.${ext}`;
    await supabase.storage.from('logos').remove([path]);
    const { error } = await supabase.storage.from('logos').upload(path, file, { upsert: true });
    if (error) { toast.error('Erro ao enviar logo'); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from('logos').getPublicUrl(path);
    setLogoUrl(urlData.publicUrl + '?t=' + Date.now());
    setUploading(false);
    toast.success('Logo enviada');
  };

  const removeLogo = async () => {
    if (!user) return;
    const prefix = lojaId || user.id;
    const { data: files } = await supabase.storage.from('logos').list(prefix);
    if (files?.length) {
      await supabase.storage.from('logos').remove(files.map(f => `${prefix}/${f.name}`));
    }
    setLogoUrl(null);
    toast.success('Logo removida');
  };

  const save = async () => {
    if (!user || !lojaId) return;
    const obj = {
      user_id: user.id, loja_id: lojaId, nome_loja: nomeLoja,
      telefone_loja: telefoneLoja, endereco_loja: enderecoLoja, logo_url: logoUrl,
    };
    if (configId) {
      await supabase.from('configuracoes').update(obj).eq('id', configId);
    } else {
      const { data } = await supabase.from('configuracoes').insert(obj).select().single();
      if (data) setConfigId(data.id);
    }
    toast.success('Configurações salvas');
  };

  const changeRole = async (userId: string, newRole: string) => {
    if (userId === user?.id) { toast.error('Você não pode alterar seu próprio papel'); return; }
    const { error } = await supabase.from('user_roles').update({ role: newRole }).eq('user_id', userId);
    if (error) { toast.error('Erro ao alterar papel'); return; }
    setRoles(prev => ({ ...prev, [userId]: newRole }));
    toast.success('Papel atualizado');
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Configurações da Loja</h1>

      <Card className="shadow-card">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Store className="h-5 w-5" /> Identidade da Loja</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-center gap-4">
            {logoUrl ? (
              <div className="relative">
                <img src={logoUrl} alt="Logo" className="h-32 w-32 object-contain rounded-lg border border-border bg-card p-2" />
                <Button size="icon" variant="destructive" className="absolute -top-2 -right-2 h-7 w-7" onClick={removeLogo}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div className="h-32 w-32 rounded-lg border-2 border-dashed border-border flex items-center justify-center text-muted-foreground">
                <Store className="h-10 w-10" />
              </div>
            )}
            <label className="cursor-pointer">
              <Button variant="outline" asChild disabled={uploading}>
                <span><Upload className="mr-2 h-4 w-4" />{uploading ? 'Enviando...' : 'Enviar Logo'}</span>
              </Button>
              <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={uploadLogo} />
            </label>
          </div>
          <div className="space-y-3">
            <Input placeholder="Nome da Loja" value={nomeLoja} onChange={e => setNomeLoja(e.target.value)} />
            <Input placeholder="Telefone da Loja" value={telefoneLoja} onChange={e => setTelefoneLoja(e.target.value)} />
            <Input placeholder="Endereço da Loja" value={enderecoLoja} onChange={e => setEnderecoLoja(e.target.value)} />
          </div>
          <Button onClick={save} className="w-full"><Save className="mr-2 h-4 w-4" /> Salvar Configurações</Button>
        </CardContent>
      </Card>

      {isAdmin && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Users className="h-5 w-5" /> Gestão de Usuários</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {usuarios.length === 0 && <p className="text-sm text-muted-foreground">Nenhum usuário encontrado.</p>}
            {usuarios.map(u => {
              const role = roles[u.user_id] || 'vendedor';
              const isMe = u.user_id === user?.id;
              return (
                <div key={u.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    {role === 'admin' ? <ShieldCheck className="h-5 w-5 text-primary" /> : <ShieldAlert className="h-5 w-5 text-muted-foreground" />}
                    <div>
                      <p className="font-medium text-sm">{u.nome || 'Sem nome'} {isMe && <Badge variant="outline" className="ml-1 text-xs">Você</Badge>}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </div>
                  {isMe ? (
                    <Badge>{role === 'admin' ? '👑 Admin' : '👨‍💼 Vendedor'}</Badge>
                  ) : (
                    <Select value={role} onValueChange={(v) => changeRole(u.user_id, v)}>
                      <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">👑 Admin</SelectItem>
                        <SelectItem value="vendedor">👨‍💼 Vendedor</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              );
            })}
            <p className="text-xs text-muted-foreground mt-2">
              Para adicionar um vendedor, peça para ele criar uma conta usando o código da loja.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
