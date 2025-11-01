import { useNavigate } from 'react-router-dom';
import { SubscriptionPaywall } from '@/components/SubscriptionPaywall';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const Subscription = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <div className="container mx-auto p-6">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        
        <SubscriptionPaywall
          onSubscribe={() => navigate('/dashboard')}
        />
      </div>
    </div>
  );
};

export default Subscription;
