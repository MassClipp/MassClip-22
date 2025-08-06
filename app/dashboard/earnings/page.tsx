'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, DollarSign, TrendingUp, Calendar } from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import { EarningsContent } from './earnings-content';
import { useToast } from '@/components/ui/use-toast';

export default function EarningsPage() {
  const { user, loading: userLoading } = useUser();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isLoadingAccountDetails, setIsLoadingAccountDetails] = useState(false);

  useEffect(() => {
    const onboardingParam = searchParams.get('onboarding');
    
    if (onboardingParam === 'success') {
      toast({
        title: "Stripe Account Connected!",
        description: "Your Stripe account has been successfully connected. You can now start accepting payments.",
        duration: 5000,
      });
      fetchAccountDetails();
    }
  }, [searchParams, toast]);

  const fetchAccountDetails = async () => {
    if (!user?.uid) return;

    setIsLoadingAccountDetails(true);
    try {
      const response = await fetch('/api/stripe/connect/fetch-account-details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userUID: user.uid }),
      });

      if (response.ok) {
        console.log('Account details fetched successfully');
      } else {
        console.error('Failed to fetch account details');
      }
    } catch (error) {
      console.error('Error fetching account details:', error);
    } finally {
      setIsLoadingAccountDetails(false);
    }
  };

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Please log in to view your earnings.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Earnings Dashboard</h1>
            <p className="text-gray-600">Track your revenue and payouts</p>
          </div>
          {isLoadingAccountDetails && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Updating account details...
            </div>
          )}
        </div>

        <EarningsContent />
      </div>
    </div>
  );
}
