import { useNavigate } from 'react-router-dom';
import { Card, PageHeader } from '@/components/ui';
import { ArrowLeft, SearchX } from 'lucide-react';

interface NotFoundPageProps {
  title?: string;
  description?: string;
  backTo?: string;
  backLabel?: string;
}

export function NotFoundPage({
  title = 'Page not found',
  description = 'The address you entered does not match a DhanMitraa workspace page.',
  backTo = '/',
  backLabel = 'Return to overview',
}: NotFoundPageProps) {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-xl pt-6 sm:pt-12">
      <PageHeader title={title} subtitle={description} sectionNum="Navigation" />
      <Card className="p-6 sm:p-8">
        <SearchX className="h-6 w-6 text-sage-500" aria-hidden="true" />
        <p className="mt-5 text-sm leading-6 text-paper-muted">Check the link, or return to a page with your current farm information.</p>
        <button type="button" onClick={() => navigate(backTo)} className="btn-outline mt-6">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          {backLabel}
        </button>
      </Card>
    </div>
  );
}
