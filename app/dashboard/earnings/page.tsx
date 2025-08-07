import React, { useState } from 'react';
import { Card, CardContent } from '@mui/material';
import { Button } from 'components/Button';
import { Loader2, AlertCircle, CreditCard, DollarSign, Globe, Shield, ExternalLink, CheckCircle, Zap, Lock, BarChart3, Info } from 'lucide-react';

const EarningsPage = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState('');

  const handleStripeConnect = async () => {
    setIsConnecting(true);
    // Simulate Stripe connection logic
    try {
      // await stripeConnect();
    } catch (error) {
      setConnectionError('Failed to connect to Stripe');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CreditCard className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">Connect Your Stripe Account</h1>
          <p className="text-xl text-gray-400">Start accepting payments and track your earnings</p>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <DollarSign className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Accept Payments</h3>
            <p className="text-gray-400">Process payments from customers worldwide</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Globe className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Global Reach</h3>
            <p className="text-gray-400">Supported in 40+ countries</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Secure & Reliable</h3>
            <p className="text-gray-400">Bank-level security and encryption</p>
          </div>
        </div>

        {/* Main Connection Card */}
        <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700 shadow-2xl">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <ExternalLink className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Connect Your Stripe Account</h2>
              <p className="text-gray-400">Securely connect your existing Stripe account through Stripe Connect</p>
            </div>

            {/* Features List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-gray-300">Secure OAuth connection</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-gray-300">No manual account IDs needed</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-gray-300">Stripe handles account verification</span>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center">
                    <Zap className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-gray-300">Instant setup and activation</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <Lock className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-gray-300">Bank-level security standards</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    <BarChart3 className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-gray-300">Real-time earnings tracking</span>
                </div>
              </div>
            </div>

            {/* Connection Button */}
            <div className="text-center">
              <Button
                onClick={handleStripeConnect}
                disabled={isConnecting}
                className="w-full max-w-md bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-4 px-8 rounded-lg shadow-lg transform transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                    Connecting to Stripe...
                  </>
                ) : (
                  <>
                    <ExternalLink className="h-5 w-5 mr-3" />
                    Connect with Stripe
                  </>
                )}
              </Button>
              <p className="text-sm text-gray-500 mt-4">
                Stripe will detect your existing account and connect it securely
              </p>
            </div>

            {/* Error Display */}
            {connectionError && (
              <div className="mt-6 p-4 bg-red-900/20 border border-red-600/50 rounded-lg">
                <div className="flex items-center gap-3 text-red-400">
                  <AlertCircle className="h-5 w-5" />
                  <span>{connectionError}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* How It Works Section */}
        <div className="mt-16">
          <div className="flex items-center justify-center mb-8">
            <Info className="h-6 w-6 text-blue-400 mr-3" />
            <h3 className="text-2xl font-bold text-white">How It Works</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-lg">
                1
              </div>
              <h4 className="text-lg font-semibold text-white mb-2">Click Connect</h4>
              <p className="text-gray-400">Start the secure connection process with Stripe</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-lg">
                2
              </div>
              <h4 className="text-lg font-semibold text-white mb-2">Authorize Access</h4>
              <p className="text-gray-400">Log in to your Stripe account and authorize the connection</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-lg">
                3
              </div>
              <h4 className="text-lg font-semibold text-white mb-2">Start Earning</h4>
              <p className="text-gray-400">Begin accepting payments and tracking your earnings</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EarningsPage;
