'use client';

import { useEffect, useTransition } from 'react';
import { RefreshCw } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { useTranslation } from '@/context/TranslationContext';

type RefreshButtonProps = {
  username: string;
};

export default function RefreshButton({ username }: RefreshButtonProps) {
  const router = useRouter();
  const { t } = useTranslation();

  const searchParams = useSearchParams();

  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (searchParams.get('refresh') === 'true') {
      toast.success(t('dashboard.refreshed_toast'));

      router.replace(`/dashboard/${username}`);
    }
  }, [searchParams, router, username, t]);

  const handleRefresh = () => {
    startTransition(() => {
      router.push(`/dashboard/${username}?refresh=true`);

      router.refresh();
    });
  };

  return (
    <button
      disabled={isPending}
      onClick={handleRefresh}
      aria-label="Refresh dashboard contribution data"
      className="flex items-center gap-2 rounded-xl border border-black/10 dark:border-white/15 bg-white dark:bg-black px-4 py-2 text-sm font-semibold text-zinc-900 dark:text-white transition-all duration-200 hover:bg-zinc-50 dark:hover:bg-white/5 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
    >
      <RefreshCw size={16} className={isPending ? 'animate-spin' : ''} />

      {isPending ? t('dashboard.refreshing') : t('dashboard.refresh_btn')}
    </button>
  );
}
