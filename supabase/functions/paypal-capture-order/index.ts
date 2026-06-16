import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function getPayPalBaseUrl() {
  const env = Deno.env.get('PAYPAL_ENV') || 'sandbox';

  return env === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
}

async function getPayPalAccessToken() {
  const clientId = Deno.env.get('PAYPAL_CLIENT_ID');
  const clientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    throw new Error('Missing PayPal credentials');
  }

  const auth = btoa(`${clientId}:${clientSecret}`);

  const response = await fetch(`${getPayPalBaseUrl()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('PayPal token error:', data);
    throw new Error('Failed to get PayPal access token');
  }

  return data.access_token;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      return new Response(
        JSON.stringify({
          error: 'Missing auth header',
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const supabaseUserClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseUserClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({
          error: 'Not authenticated',
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const body = await req.json();
    const paypalOrderId = body?.paypalOrderId;

    if (!paypalOrderId) {
      return new Response(
        JSON.stringify({
          error: 'Missing PayPal order ID',
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceRoleKey
    );

    const { data: paymentOrder, error: paymentOrderError } =
      await supabaseAdmin
        .from('payment_orders')
        .select('*')
        .eq('paypal_order_id', paypalOrderId)
        .eq('user_id', user.id)
        .single();

    if (paymentOrderError || !paymentOrder) {
      return new Response(
        JSON.stringify({
          error: 'Payment order not found',
        }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    if (paymentOrder.granted_at) {
      return new Response(
        JSON.stringify({
          ok: true,
          message: 'Purchase was already granted.',
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const accessToken = await getPayPalAccessToken();

    const captureResponse = await fetch(
      `${getPayPalBaseUrl()}/v2/checkout/orders/${paypalOrderId}/capture`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
      }
    );

    const captureData = await captureResponse.json();

    if (!captureResponse.ok) {
      console.error('PayPal capture error:', captureData);

      await supabaseAdmin
        .from('payment_orders')
        .update({
          status: 'capture_failed',
          raw_capture_response: captureData,
        })
        .eq('id', paymentOrder.id);

      throw new Error('Could not capture PayPal order');
    }

    const capture =
      captureData?.purchase_units?.[0]?.payments?.captures?.[0];

    const captureStatus = capture?.status;
    const captureId = capture?.id;
    const capturedAmount = capture?.amount?.value;
    const capturedCurrency = capture?.amount?.currency_code;

    const expectedAmount = (paymentOrder.amount_cents / 100).toFixed(2);

    if (captureStatus !== 'COMPLETED') {
      throw new Error(`Capture was not completed. Status: ${captureStatus}`);
    }

    if (capturedAmount !== expectedAmount) {
      throw new Error('Captured amount does not match expected amount');
    }

    if (capturedCurrency !== paymentOrder.currency) {
      throw new Error('Captured currency does not match expected currency');
    }

    await supabaseAdmin
      .from('payment_orders')
      .update({
        status: 'captured',
        paypal_capture_id: captureId,
        raw_capture_response: captureData,
        captured_at: new Date().toISOString(),
      })
      .eq('id', paymentOrder.id);

    const { data: grantData, error: grantError } = await supabaseAdmin.rpc(
      'grant_store_purchase_reward',
      {
        p_payment_order_id: paymentOrder.id,
      }
    );

    if (grantError) {
      console.error('Grant error:', grantError);
      throw new Error('Payment captured, but reward grant failed');
    }

    return new Response(
      JSON.stringify({
        ok: true,
        message: 'Purchase complete. Gems added.',
        grant: grantData,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('paypal-capture-order error:', error);

    return new Response(
      JSON.stringify({
        error: error?.message || 'Server error',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});