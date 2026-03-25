import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X, WifiOff } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);

    window.addEventListener('appinstalled', () => {
      setDeferredPrompt(null);
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
  };

  if (!deferredPrompt || dismissed) return null;

  return (
    <div className="bg-primary text-primary-foreground px-4 py-2.5 flex items-center justify-between gap-3 text-sm">
      <div className="flex items-center gap-2 min-w-0">
        <Download className="h-4 w-4 shrink-0" />
        <span className="truncate">Instale o Treze7 Pro no seu celular para usar offline!</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button size="sm" variant="secondary" onClick={handleInstall} className="h-7 text-xs font-semibold">
          Instalar App
        </Button>
        <button onClick={() => setDismissed(true)} className="opacity-70 hover:opacity-100">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="bg-destructive text-destructive-foreground px-4 py-1.5 text-center text-xs font-medium flex items-center justify-center gap-2">
      <WifiOff className="h-3 w-3" />
      Você está offline — os dados serão sincronizados quando a conexão voltar.
    </div>
  );
}
