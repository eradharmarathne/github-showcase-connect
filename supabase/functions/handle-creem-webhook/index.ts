import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Webhook } from "https://esm.sh/svix@1.15.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature',
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

    // Get Svix webhook secret
    const SVIX_WEBHOOK_SECRET = Deno.env.get('SVIX_WEBHOOK_SECRET');
    if (!SVIX_WEBHOOK_SECRET) {
      console.error('❌ SVIX_WEBHOOK_SECRET environment variable not set');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Get payload and headers for Svix verification
    const payload = await req.text();
    const svixId = req.headers.get('svix-id');
    const svixTimestamp = req.headers.get('svix-timestamp');
    const svixSignature = req.headers.get('svix-signature');

    console.log('📨 Received webhook:', {
      svixId,
      svixTimestamp,
      hasSignature: !!svixSignature,
      payloadLength: payload.length,
    });

    // Verify webhook signature with Svix
    const wh = new Webhook(SVIX_WEBHOOK_SECRET);
    let event;

    try {
      event = wh.verify(payload, {
        'svix-id': svixId || '',
        'svix-timestamp': svixTimestamp || '',
        'svix-signature': svixSignature || '',
      });
      console.log('✅ Webhook signature verified successfully');
    } catch (err) {
      console.error('❌ Webhook signature verification failed:', err.message);
      return new Response(
        JSON.stringify({ error: 'Invalid webhook signature' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    console.log('📋 Processing webhook event:', event.type);

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
  console.log('🎉 Handling checkout completed:', data);

  // Extract customer and subscription information
  const { customer_id, subscription_id, metadata, id: checkout_id } = data;

  // Validate required metadata
  if (!metadata?.tenant_id || !metadata?.user_id) {
    console.error('❌ Missing required metadata (tenant_id or user_id):', metadata);
    throw new Error('Invalid webhook metadata');
  }

  console.log('✅ Metadata validated:', { tenant_id: metadata.tenant_id, user_id: metadata.user_id });

  // 1. Update payment attempt record
  const { error: paymentError } = await supabase
    .from('payment_attempts')
    .update({
      status: 'completed',
      creem_order_id: checkout_id,
      completed_at: new Date().toISOString(),
    })
    .eq('checkout_session_id', checkout_id);

  if (paymentError) {
    console.warn('⚠️ Could not update payment_attempts (table may not exist yet):', paymentError);
  }

  // 2. Update tenant status from pending_payment to active
  const { error: tenantError } = await supabase
    .from('tenants')
    .update({
      subscription_status: 'active',
      trial_ends_at: null, // Clear trial if paying immediately
      updated_at: new Date().toISOString(),
    })
    .eq('id', metadata.tenant_id)
    .eq('subscription_status', 'pending_payment'); // Only update if still pending

  if (tenantError) {
    console.error('❌ Error updating tenant status:', tenantError);
    throw tenantError;
  }

  // 3. Update or create subscription record
  const { data: existingSub, error: fetchError } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('tenant_id', metadata.tenant_id)
    .maybeSingle();

  if (fetchError && fetchError.code !== 'PGRST116') {
    console.error('❌ Error fetching existing subscription:', fetchError);
    throw fetchError;
  }

  const subscriptionData = {
    tenant_id: metadata.tenant_id,
    creem_customer_id: customer_id,
    creem_subscription_id: subscription_id,
    status: 'active',
    plan_id: metadata.plan_id || 'professional',
    current_period_start: new Date().toISOString(),
    current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (existingSub) {
    // Update existing subscription
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update(subscriptionData)
      .eq('id', existingSub.id);

    if (updateError) {
      console.error('❌ Error updating subscription:', updateError);
      throw updateError;
    }
  } else {
    // Create new subscription
    const { error: insertError } = await supabase
      .from('subscriptions')
      .insert(subscriptionData);

    if (insertError) {
      console.error('❌ Error creating subscription:', insertError);
      throw insertError;
    }
  }

  console.log('✅ Successfully processed payment for tenant:', metadata.tenant_id);
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