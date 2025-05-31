import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { supabase } from '../lib/supabase';
import { PRICING_PLANS, PlanId, formatPrice } from '../lib/stripe';
import { CreditCard, Loader2, Check, X } from 'lucide-react';

interface SubscriptionCheckoutProps {
  planId: PlanId;
  onCancel: () => void;
}

export default function SubscriptionCheckout({ planId, onCancel }: SubscriptionCheckoutProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const plan = PRICING_PLANS[planId];

  const handleCheckout = async () => {
    if (!plan.priceId) {
      setError('Invalid plan selected');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      // Create checkout session
      const { data, error: checkoutError } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          priceId: plan.priceId,
          successUrl: `${window.location.origin}/dashboard?success=true`,
          cancelUrl: `${window.location.origin}/dashboard?canceled=true`,
        }
      });

      if (checkoutError) throw checkoutError;

      // Redirect to Stripe Checkout
      const stripe = await loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
      if (!stripe) throw new Error('Stripe failed to load');

      const { error: stripeError } = await stripe.redirectToCheckout({
        sessionId: data.sessionId
      });

      if (stripeError) throw stripeError;
    } catch (err: any) {
      console.error('Checkout error:', err);
      setError(err.message || 'Failed to start checkout process');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Subscribe to {plan.name}
        </h2>

        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{plan.name} Plan</h3>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {formatPrice(plan.price)}
                <span className="text-base font-normal text-gray-600">/month</span>
              </p>
            </div>
            <CreditCard className="h-8 w-8 text-indigo-600" />
          </div>

          <ul className="space-y-3">
            {plan.features.map((feature, index) => (
              <li key={index} className="flex items-start space-x-3">
                <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-gray-700">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleCheckout}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="h-5 w-5" />
                Subscribe Now
              </>
            )}
          </button>
          
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center mt-4">
          Secure payment powered by Stripe. Cancel anytime.
        </p>
      </div>
    </div>
  );
}