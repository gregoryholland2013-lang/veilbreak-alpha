import React from 'react';
import { PayPalButtons } from '@paypal/react-paypal-js';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { isAndroidApp } from '@/lib/platform';

export default function PayPalPurchaseButton({
  sku,
  label = 'Buy with PayPal',
  onSuccess,
}) {
  // Google Play compliance safety:
  // PayPal should never render inside the Android app build.
  if (isAndroidApp()) {
    return null;
  }

  if (!sku) return null;

  return (
    <div className="mt-3 overflow-hidden rounded-xl bg-white p-2">
      <PayPalButtons
        style={{
          layout: 'vertical',
          shape: 'pill',
          label: 'paypal',
        }}
        createOrder={async () => {
          const { data, error } = await supabase.functions.invoke(
            'paypal-create-order',
            {
              body: { sku },
            }
          );

          if (error) {
            console.error(error);
            toast.error('Could not start PayPal checkout.');
            throw error;
          }

          if (!data?.paypalOrderId) {
            toast.error('PayPal order ID was not returned.');
            throw new Error('Missing PayPal order ID');
          }

          return data.paypalOrderId;
        }}
        onApprove={async (data) => {
          const { data: captureData, error } =
            await supabase.functions.invoke('paypal-capture-order', {
              body: {
                paypalOrderId: data.orderID,
              },
            });

          if (error) {
            console.error(error);
            toast.error(
              'Payment approved, but reward delivery failed. Contact support.'
            );
            throw error;
          }

          toast.success(captureData?.message || 'Purchase complete!');

          if (onSuccess) {
            onSuccess(captureData);
          }
        }}
        onCancel={() => {
          toast.info('PayPal checkout cancelled.');
        }}
        onError={(err) => {
          console.error(err);
          toast.error('PayPal checkout failed.');
        }}
      />
    </div>
  );
}