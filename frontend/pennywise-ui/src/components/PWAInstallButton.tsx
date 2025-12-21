import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { usePWAInstall } from '@/hooks/use-pwa-install';
import { Download } from 'lucide-react';

interface PWAInstallButtonProps {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showLabel?: boolean;
  className?: string;
}

export function PWAInstallButton({
  variant = 'outline',
  size = 'sm',
  showLabel = true,
  className,
}: PWAInstallButtonProps) {
  const { canInstall, install } = usePWAInstall();

  if (!canInstall) return null;

  const handleInstall = async () => {
    await install();
  };

  if (showLabel) {
    return (
      <Button variant={variant} size={size} onClick={handleInstall} className={className}>
        <Download className="mr-2 h-4 w-4" />
        Install App
      </Button>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant={variant} size="icon" onClick={handleInstall} className={className}>
          <Download className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Install Pennywise</p>
      </TooltipContent>
    </Tooltip>
  );
}
