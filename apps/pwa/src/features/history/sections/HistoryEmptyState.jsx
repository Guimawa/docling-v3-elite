import React from 'react'
import { Package } from 'lucide-react'
import Button from '@/components/Button'
import EmptyStateIllustration from '@/shared/ui/EmptyStateIllustration'

export default function HistoryEmptyState({ navigate, t }) {
  return (
    <div className="flex flex-col items-center pt-12 text-text-tertiary gap-5 px-6">
      <div className="w-full max-w-xs h-40">
        <EmptyStateIllustration className="w-full h-full min-h-[160px]" />
      </div>
      <div className="text-center space-y-2">
        <h2 className="text-lg font-bold text-text-secondary">{t.history.emptyTitle}</h2>
        <p className="text-sm text-text-secondary max-w-xs">
          {t.history.emptySubtitle}
        </p>
      </div>
      <Button
        onClick={() => navigate('/scan')}
        variant="primary"
        className="bg-primary hover:bg-cta-hover"
      >
        <Package size={16} />
        {t.history.scanInvoice}
      </Button>
    </div>
  )
}
