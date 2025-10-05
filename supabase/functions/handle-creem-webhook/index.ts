import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-creem-signature',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify the webhook signature (optional but recommended for security)
    const signature = req.headers.get('x-creem-signature');
    const payload = await req.text();
    
    console.log('Received Creem webhook:', {
      signature,
      payloadLength: payload.length,
      headers: Object.fromEntries(req.headers.entries())
    });

    // Parse the webhook payload
    const event = JSON.parse(payload);
    console.log('Webhook event:', event);

    // Handle different Creem webhook events
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(supabase, event.data);
        break;
        
      case 'subscription.created':
        await handleSubscriptionCreated(supabase, event.data);
        break;
        
      case 'subscription.updated':
        await handleSubscriptionUpdated(supabase, event.data);
        break;
        
      case 'payment.succeeded':
        await handlePaymentSucceeded(supabase, event.data);
        break;
        
      case 'payment.failed':
        await handlePaymentFailed(supabase, event.data);
        break;
        
      default:
        console.log('Unhandled webhook event type:', event.type);
    }

    return new Response(
      JSON.stringify({ received: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

async function handleCheckoutCompleted(supabase: any, data: any) {
  console.log('Handling checkout completed:', data);
  
  // Extract customer and subscription information
  const { customer_id, subscription_id, metadata } = data;
  
  if (metadata?.tenant_id) {
    // Update the subscription in our database
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        creem_customer_id: customer_id,
        creem_subscription_id: subscription_id,
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', metadata.tenant_id);

    if (updateError) {
      console.error('Error updating subscription:', updateError);
      throw updateError;
    }

    // Update tenant status
    const { error: tenantError } = await supabase
      .from('tenants')
      .update({
        subscription_status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', metadata.tenant_id);

    if (tenantError) {
      console.error('Error updating tenant:', tenantError);
      throw tenantError;
    }

    console.log('Successfully updated subscription and tenant status');
  }
}

async function handleSubscriptionCreated(supabase: any, data: any) {
  console.log('Handling subscription created:', data);
  
  // This might be called when a subscription is first created
  // The subscription should already exist in our database from the checkout process
  const { id: creem_subscription_id, customer_id, plan_id, status } = data;
  
  // Find the subscription by creem_subscription_id and update it
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: status,
      updated_at: new Date().toISOString(),
    })
    .eq('creem_subscription_id', creem_subscription_id);

  if (error) {
    console.error('Error updating subscription from webhook:', error);
  }
}

async function handleSubscriptionUpdated(supabase: any, data: any) {
  console.log('Handling subscription updated:', data);
  
  const { id: creem_subscription_id, status, current_period_start, current_period_end } = data;
  
  // Update subscription status and billing period
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: status,
      current_period_start: current_period_start ? new Date(current_period_start * 1000).toISOString() : null,
      current_period_end: current_period_end ? new Date(current_period_end * 1000).toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('creem_subscription_id', creem_subscription_id);

  if (error) {
    console.error('Error updating subscription:', error);
    throw error;
  }

  // Also update tenant status based on subscription status
  const { data: subscriptionData, error: fetchError } = await supabase
    .from('subscriptions')
    .select('tenant_id')
    .eq('creem_subscription_id', creem_subscription_id)
    .single();

  if (!fetchError && subscriptionData) {
    let tenantStatus = 'trial';
    if (status === 'active') tenantStatus = 'active';
    else if (status === 'cancelled' || status === 'expired') tenantStatus = 'cancelled';
    
    await supabase
      .from('tenants')
      .update({
        subscription_status: tenantStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscriptionData.tenant_id);
  }
}

async function handlePaymentSucceeded(supabase: any, data: any) {
  console.log('Handling payment succeeded:', data);
  
  const { subscription_id, amount, currency } = data;
  
  if (subscription_id) {
    // Update subscription to active status
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('creem_subscription_id', subscription_id);

    if (error) {
      console.error('Error updating subscription after payment:', error);
    }
  }
  
  // You might also want to log the payment in a payments table
  console.log(`Payment succeeded: ${amount} ${currency} for subscription ${subscription_id}`);
}

async function handlePaymentFailed(supabase: any, data: any) {
  console.log('Handling payment failed:', data);
  
  const { subscription_id, error_message } = data;
  
  if (subscription_id) {
    // You might want to update the subscription status or send notifications
    console.log(`Payment failed for subscription ${subscription_id}: ${error_message}`);
    
    // Optionally update subscription status to past_due
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'past_due',
        updated_at: new Date().toISOString(),
      })
      .eq('creem_subscription_id', subscription_id);

    if (error) {
      console.error('Error updating subscription after payment failure:', error);
    }
  }
}