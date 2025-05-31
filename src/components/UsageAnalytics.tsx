import React, { useEffect, useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Activity,
  Calendar,
  AlertCircle 
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getUserUsageSummary, checkUsageLimits } from '../lib/usage-tracking';
import { formatPrice } from '../lib/stripe';

interface UsageData {
  month: Date;
  services: Array<{
    service_type: string;
    total_calls: number;
    total_tokens: number;
    total_cost: number;
    success_rate: number;
  }>;
  totalCost: number;
  totalCalls: number;
}

interface UsageLimits {
  nearLimit: boolean;
  percentageUsed: number;
  message?: string;
}

export default function UsageAnalytics() {
  const [loading, setLoading] = useState(true);
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [limits, setLimits] = useState<UsageLimits>({ nearLimit: false, percentageUsed: 0 });
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  useEffect(() => {
    fetchUsageData();
  }, [selectedMonth]);

  const fetchUsageData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get usage data
      const usage = await getUserUsageSummary(user.id, selectedMonth);
      setUsageData(usage);

      // Check limits
      const limitCheck = await checkUsageLimits(user.id);
      setLimits(limitCheck);
    } catch (error) {
      console.error('Error fetching usage data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getServiceIcon = (serviceType: string) => {
    const icons: Record<string, React.ReactNode> = {
      research: '🔍',
      script: '📝',
      characters: '🎨',
      audio: '🎙️',
      video: '🎬'
    };
    return icons[serviceType] || '📊';
  };

  const getServiceName = (serviceType: string) => {
    const names: Record<string, string> = {
      research: 'Research',
      script: 'Script Generation',
      characters: 'Character Design',
      audio: 'Voice Synthesis',
      video: 'Video Compilation'
    };
    return names[serviceType] || serviceType;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Usage Warning */}
      {limits.nearLimit && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-900">Usage Alert</p>
              <p className="text-sm text-amber-700 mt-1">{limits.message}</p>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Calls</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {usageData?.totalCalls || 0}
              </p>
            </div>
            <Activity className="h-8 w-8 text-indigo-600 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Cost</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatPrice(usageData?.totalCost || 0)}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-green-600 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Usage</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {limits.percentageUsed.toFixed(0)}%
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-600 opacity-20" />
          </div>
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all ${
                  limits.percentageUsed >= 90 ? 'bg-red-600' : 
                  limits.percentageUsed >= 70 ? 'bg-amber-600' : 
                  'bg-green-600'
                }`}
                style={{ width: `${Math.min(limits.percentageUsed, 100)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Period</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">
                {selectedMonth.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </p>
            </div>
            <Calendar className="h-8 w-8 text-purple-600 opacity-20" />
          </div>
        </div>
      </div>

      {/* Service Breakdown */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-indigo-600" />
          Service Usage Breakdown
        </h3>

        {usageData && usageData.services.length > 0 ? (
          <div className="space-y-4">
            {usageData.services.map((service) => (
              <div key={service.service_type} className="border-b border-gray-100 pb-4 last:border-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getServiceIcon(service.service_type)}</span>
                    <div>
                      <p className="font-medium text-gray-900">
                        {getServiceName(service.service_type)}
                      </p>
                      <p className="text-sm text-gray-600">
                        {service.total_calls} calls • {service.success_rate.toFixed(1)}% success rate
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{formatPrice(service.total_cost)}</p>
                    {service.total_tokens > 0 && (
                      <p className="text-sm text-gray-600">
                        {service.total_tokens.toLocaleString()} tokens
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Cost bar visualization */}
                <div className="mt-2">
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div 
                      className="h-2 bg-indigo-600 rounded-full"
                      style={{ 
                        width: `${usageData.totalCost > 0 
                          ? (service.total_cost / usageData.totalCost * 100) 
                          : 0}%` 
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">No usage data for this period</p>
          </div>
        )}
      </div>

      {/* Month Selector */}
      <div className="flex justify-center">
        <div className="flex items-center gap-4 bg-white rounded-lg shadow-sm border border-gray-200 px-4 py-2">
          <button
            onClick={() => {
              const newDate = new Date(selectedMonth);
              newDate.setMonth(newDate.getMonth() - 1);
              setSelectedMonth(newDate);
            }}
            className="text-gray-600 hover:text-gray-900"
          >
            ←
          </button>
          <span className="font-medium text-gray-900">
            {selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
          <button
            onClick={() => {
              const newDate = new Date(selectedMonth);
              newDate.setMonth(newDate.getMonth() + 1);
              if (newDate <= new Date()) {
                setSelectedMonth(newDate);
              }
            }}
            disabled={selectedMonth.getMonth() === new Date().getMonth() && 
                     selectedMonth.getFullYear() === new Date().getFullYear()}
            className="text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}