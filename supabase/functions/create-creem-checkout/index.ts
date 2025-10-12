import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.log('Edge Function called with method:', req.method);
  console.log('Headers:', Object.fromEntries(req.headers.entries()));

  if (req.method !== 'POST') {
    return new Response('Method not allowed', {
      status: 405,
      headers: corsHeaders
    });
  }

  try {
    const requestBody = await req.json();
    console.log('Received request body:', JSON.stringify(requestBody, null, 2));

    const { product_id, success_url, error_url, cancel_url, request_id, metadata, customer, units, discountCode } = requestBody;

    console.log('Extracted product_id:', product_id);
    console.log('Extracted success_url:', success_url);
    console.log('Extracted customer:', customer);

    // Validate required parameters
    if (!product_id) {
      console.log('product_id is missing or empty');
      return new Response(JSON.stringify({ error: 'product_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get Creem API key from environment variables
    const CREEM_API_KEY = Deno.env.get('CREEM_API_KEY');
    if (!CREEM_API_KEY) {
      console.error('CREEM_API_KEY environment variable not set');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Prepare request body for Creem API
    // Note: Creem API only accepts success_url, not error_url or cancel_url
    const creemRequestBody: any = {
      product_id,
    };

    if (success_url) creemRequestBody.success_url = success_url;
    // error_url and cancel_url are not accepted by Creem API - removed
    if (request_id) creemRequestBody.request_id = request_id;
    if (metadata) creemRequestBody.metadata = metadata;
    if (customer) creemRequestBody.customer = customer;
    if (units) creemRequestBody.units = units;
    if (discountCode) creemRequestBody.discount_code = discountCode;

    console.log('Proxying request to Creem API:', {
      url: 'https://api.creem.io/v1/checkouts',
      body: creemRequestBody,
    });

    // Make request to Creem API
    const response = await fetch('https://api.creem.io/v1/checkouts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CREEM_API_KEY,
        'accept': 'application/json',
      },
      body: JSON.stringify(creemRequestBody),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('Creem API error:', {
        status: response.status,
        statusText: response.statusText,
        body: responseData,
      });

      return new Response(JSON.stringify({
        error: 'Creem API error',
        details: responseData,
      }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Creem API success:', responseData);

    // Return successful response
    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in create-creem-checkout function:', error);

    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});