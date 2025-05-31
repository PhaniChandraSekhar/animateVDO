import React, { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { PRICING_PLANS, formatPrice } from '../lib/stripe';
import SubscriptionCheckout from './SubscriptionCheckout';

interface PricingProps {
  showAuth?: boolean;
}

export default function Pricing({ showAuth = true }: PricingProps) {
  const [user, setUser] = useState<any>(null);
  const [currentPlan, setCurrentPlan] = useState<string>('hobby');
  const [showCheckout, setShowCheckout] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUser(user);
      // Get user's current plan
      const { data: userData } = await supabase
        .from('users')
        .select('subscription_plan')
        .eq('id', user.id)
        .single();
      
      if (userData) {
        setCurrentPlan(userData.subscription_plan || 'hobby');
      }
    }
  };

  const handlePlanClick = (planId: string) => {
    if (!user) {
      navigate('/auth');
    } else if (planId === 'hobby') {
      // Downgrade to free plan
      navigate('/dashboard');
    } else if (planId === 'enterprise') {
      // Contact sales
      window.location.href = 'mailto:sales@animatevdo.com?subject=Enterprise Plan Inquiry';
    } else {
      // Show checkout
      setShowCheckout(planId);
    }
  };

  const tiers = [
    {
      id: 'hobby',
      name: PRICING_PLANS.hobby.name,
      price: PRICING_PLANS.hobby.price,
      features: PRICING_PLANS.hobby.features,
      cta: user && currentPlan === 'hobby' ? 'Current Plan' : 'Start for free',
      mostPopular: false,
      disabled: user && currentPlan === 'hobby'
    },
    {
      id: 'pro',
      name: PRICING_PLANS.pro.name,
      price: PRICING_PLANS.pro.price,
      features: PRICING_PLANS.pro.features,
      cta: user && currentPlan === 'pro' ? 'Current Plan' : 'Subscribe now',
      mostPopular: true,
      disabled: user && currentPlan === 'pro'
    },
    {
      id: 'enterprise',
      name: PRICING_PLANS.enterprise.name,
      price: PRICING_PLANS.enterprise.price,
      features: PRICING_PLANS.enterprise.features,
      cta: user && currentPlan === 'enterprise' ? 'Current Plan' : 'Contact sales',
      mostPopular: false,
      disabled: user && currentPlan === 'enterprise'
    },
  ];

  return (
    <div id="pricing" className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-base font-semibold leading-7 text-indigo-600">Pricing</h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Choose the perfect plan for your needs
          </p>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Start creating amazing stories today with our flexible pricing options.
          </p>
        </div>
        <div className="isolate mx-auto mt-16 grid max-w-md grid-cols-1 gap-y-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`flex flex-col justify-between rounded-3xl bg-white p-8 xl:p-10 ${
                tier.mostPopular
                  ? 'lg:z-10 ring-2 ring-indigo-600 shadow-xl'
                  : 'ring-1 ring-gray-200'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-x-4">
                  <h3 className="text-lg font-semibold leading-8 text-gray-900">{tier.name}</h3>
                  {tier.mostPopular && (
                    <p className="rounded-full bg-indigo-600/10 px-2.5 py-1 text-xs font-semibold leading-5 text-indigo-600">
                      Most popular
                    </p>
                  )}
                </div>
                <p className="mt-6 flex items-baseline gap-x-1">
                  <span className="text-4xl font-bold tracking-tight text-gray-900">${tier.price}</span>
                  <span className="text-sm font-semibold leading-6 text-gray-600">/month</span>
                </p>
                <ul role="list" className="mt-8 space-y-3 text-sm leading-6 text-gray-600">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex gap-x-3">
                      <Check className="h-6 w-5 flex-none text-indigo-600" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              <button
                onClick={() => !tier.disabled && handlePlanClick(tier.id)}
                disabled={tier.disabled}
                className={`mt-8 block w-full rounded-md px-3 py-2 text-center text-sm font-semibold leading-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                  tier.disabled
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : tier.mostPopular
                    ? 'bg-indigo-600 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline-indigo-600 transition-colors duration-200'
                    : 'text-indigo-600 ring-1 ring-inset ring-indigo-200 hover:ring-indigo-300 hover:bg-indigo-50 transition-all duration-200'
                }`}
              >
                {tier.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
      
      {showCheckout && (
        <SubscriptionCheckout
          planId={showCheckout as any}
          onCancel={() => setShowCheckout(null)}
        />
      )}
    </div>
  );
}