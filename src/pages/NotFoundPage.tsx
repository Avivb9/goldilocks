import { Compass } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, EmptyState } from '../components/ui';

export function NotFoundPage({ what }: { what?: string }) {
  const navigate = useNavigate();
  return (
    <Card className="mx-auto mt-10 max-w-xl">
      <EmptyState
        icon={<Compass size={20} />}
        title={what ? `We couldn't find that ${what}` : "This page doesn't exist"}
        body={what ? `It may have been deleted or the link is out of date.` : 'Check the address, or head back to your studies.'}
        action={
          <Button variant="primary" onClick={() => navigate('/')}>
            Back to Studies
          </Button>
        }
      />
    </Card>
  );
}
