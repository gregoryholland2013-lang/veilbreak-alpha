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
    const sku = body?.sku;

    if (!sku) {
      return new Response(
        JSON.stringify({
          error: 'Missing product sku',
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

    const { data: product, error: productError } = await supabaseAdmin
      .from('store_products')
      .select('*')
      .eq('sku', sku)
      .eq('active', true)
      .single();

    if (productError || !product) {
      return new Response(
        JSON.stringify({
          error: 'Product not found',
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

    const { data: paymentOrder, error: paymentOrderError } =
      await supabaseAdmin
        .from('payment_orders')
        .insert({
          user_id: user.id,
          product_sku: product.sku,
          amount_cents: product.price_cents,
          currency: product.currency,
          status: 'created',
        })
        .select('*')
        .single();

    if (paymentOrderError || !paymentOrder) {
      console.error('Payment order insert error:', paymentOrderError);
      throw new Error('Could not create local payment order');
    }

    const accessToken = await getPayPalAccessToken();

    const paypalResponse = await fetch(
      `${getPayPalBaseUrl()}/v2/checkout/orders`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [
            {
              reference_id: paymentOrder.id,
              custom_id: paymentOrder.id,
              description: product.name,
              amount: {
                currency_code: product.currency,
                value: (product.price_cents / 100).toFixed(2),
              },
            },
          ],
        }),
      }
    );

    const paypalData = await paypalResponse.json();

    if (!paypalResponse.ok) {
      console.error('PayPal create order error:', paypalData);

      await supabaseAdmin
        .from('payment_orders')
        .update({
          status: 'paypal_create_failed',
          raw_create_response: paypalData,
        })
        .eq('id', paymentOrder.id);

      throw new Error('Could not create PayPal order');
    }

    await supabaseAdmin
      .from('payment_orders')
      .update({
        paypal_order_id: paypalData.id,
        raw_create_response: paypalData,
      })
      .eq('id', paymentOrder.id);

    return new Response(
      JSON.stringify({
        paypalOrderId: paypalData.id,
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
    console.error('paypal-create-order error:', error);

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