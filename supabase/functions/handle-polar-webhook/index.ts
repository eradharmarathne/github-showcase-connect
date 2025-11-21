import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Webhooks } from "jsr:@polar-sh/deno";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-polar-signature",
};

// Polar webhook event types
interface PolarWebhookData {
  id: string;
  customer_id?: string;
  checkout_id?: string;
  subscription_id?: string;
  product_id?: string;
  status?: string;
  current_period_start?: string;
  current_period_end?: string;
  canceled_at?: string;
  ends_at?: string;
  metadata?: Record<string, string>;
  customer?: {
    id: string;
    email?: string;
  };
  amount?: number;
  currency?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("❌ Missing Supabase configuration");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        },
      );
    }

    // Create Supabase client with validated credentials
    // Type assertion is safe because we validated env vars above
    const supabase = createClient(
      supabaseUrl,
      supabaseServiceKey,
    ) as SupabaseClient;

    // Get Polar webhook secret
    const POLAR_WEBHOOK_SECRET = Deno.env.get("POLAR_WEBHOOK_SECRET");
    if (!POLAR_WEBHOOK_SECRET) {
      console.error("❌ POLAR_WEBHOOK_SECRET environment variable not set");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        },
      );
    }

    // Process webhook using Polar's Webhooks handler with onPayload callback
    let event;
    let processed = false;

    const webhookHandler = Webhooks({
      webhookSecret: POLAR_WEBHOOK_SECRET,
      onPayload: async (payload) => {
        console.log("✅ Webhook signature verified successfully");
        console.log("📋 Processing webhook event:", payload.type);
        event = payload;
        processed = true;
        // Return void - we'll handle the response after processing
      },
    });

    // Execute the webhook handler
    try {
      await webhookHandler(req);

      // If webhook wasn't processed, return error
      if (!processed || !event) {
        console.error("❌ Webhook payload not received");
        return new Response(
          JSON.stringify({ error: "Webhook processing failed" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
          },
        );
      }
    } catch (error) {
      console.error("❌ Webhook verification failed:", error);
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // Check for duplicate webhook (idempotency)
    const eventId = event.id || crypto.randomUUID();
    const { data: existingEvent } = await supabase
      .from("polar_webhook_events")
      .select("id, processed_at, retry_count")
      .eq("event_id", eventId)
      .maybeSingle();

    if (existingEvent?.processed_at) {
      console.log("⚠️ Webhook already processed, skipping:", eventId);
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Store webhook event for tracking (processed_at starts as NULL)
    if (!existingEvent) {
      await supabase.from("polar_webhook_events").insert({
        event_id: eventId,
        event_type: event.type,
        payload: event,
        processed_at: null, // Will be set to NOW() only after successful processing
        retry_count: 0,
      });
    }

    // Handle different Polar webhook events
    try {
      switch (event.type) {
        case "checkout.created":
          await handleCheckoutCreated(supabase, event.data);
          break;

        case "subscription.active":
          await handleSubscriptionActive(supabase, event.data);
          break;

        case "subscription.created":
          await handleSubscriptionCreated(supabase, event.data);
          break;

        case "subscription.updated":
          await handleSubscriptionUpdated(supabase, event.data);
          break;

        case "subscription.canceled":
          await handleSubscriptionCanceled(supabase, event.data);
          break;

        case "subscription.revoked":
          await handleSubscriptionRevoked(supabase, event.data);
          break;

        case "order.paid":
          await handleOrderPaid(supabase, event.data);
          break;

        default:
          console.log("ℹ️ Unhandled webhook event type:", event.type);
      }

      // Mark webhook as processed
      await supabase
        .from("polar_webhook_events")
        .update({
          processed_at: new Date().toISOString(),
        })
        .eq("event_id", eventId);

      console.log("✅ Successfully processed webhook:", event.type);
    } catch (processingError) {
      // Log error but don't mark as processed
      await supabase
        .from("polar_webhook_events")
        .update({
          error_message: processingError.message,
          retry_count: existingEvent ? existingEvent.retry_count + 1 : 1,
        })
        .eq("event_id", eventId);

      throw processingError;
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("❌ Webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

async function handleCheckoutCreated(
  supabase: SupabaseClient,
  data: PolarWebhookData,
) {
  console.log("🛒 Handling checkout created:", data.id);

  // Log checkout creation - useful for debugging
  // The actual payment confirmation happens in subscription.active or order.paid events
  console.log("✅ Checkout created:", {
    checkoutId: data.id,
    productId: data.product_id,
    customerId: data.customer_id,
  });
}

async function handleSubscriptionActive(
  supabase: SupabaseClient,
  data: PolarWebhookData,
) {
  console.log("🎉 Handling subscription active:", data);

  // Extract subscription information
  const {
    id: polar_subscription_id,
    customer_id: polar_customer_id,
    checkout_id: polar_checkout_id,
    status,
    current_period_start,
    current_period_end,
    metadata,
    product_id,
    product_price_id,
    customer,
  } = data;

  // Validate required metadata
  if (!metadata?.tenant_id) {
    console.error("❌ Missing required metadata (tenant_id):", metadata);
    throw new Error("Invalid webhook metadata: missing tenant_id");
  }

  const tenantId = metadata.tenant_id;
  const userId = metadata.user_id || customer?.id;

  console.log("✅ Metadata validated:", {
    tenant_id: tenantId,
    user_id: userId,
  });

  // 1. Update payment attempt record (if exists)
  if (polar_checkout_id) {
    const { error: paymentError } = await supabase
      .from("payment_attempts")
      .update({
        status: "completed",
        polar_order_id: polar_checkout_id,
        polar_customer_id: polar_customer_id,
        polar_subscription_id: polar_subscription_id,
        polar_checkout_id: polar_checkout_id,
        completed_at: new Date().toISOString(),
      })
      .eq("checkout_session_id", polar_checkout_id);

    if (paymentError) {
      console.warn(
        "⚠️ Could not update payment_attempts:",
        paymentError.message,
      );
    }
  }

  // 2. Update tenant status from pending_payment to active
  const { error: tenantError } = await supabase
    .from("tenants")
    .update({
      subscription_status: "active",
      trial_ends_at: null, // Clear trial when subscription activates
      updated_at: new Date().toISOString(),
    })
    .eq("id", tenantId)
    .in("subscription_status", ["pending_payment", "trialing", "trial"]); // Update from any pre-active state

  if (tenantError) {
    console.error("❌ Error updating tenant status:", tenantError);
    throw tenantError;
  }

  // 3. Update or create subscription record
  const { data: existingSub, error: fetchError } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (fetchError && fetchError.code !== "PGRST116") {
    console.error("❌ Error fetching existing subscription:", fetchError);
    throw fetchError;
  }

  const subscriptionData = {
    tenant_id: tenantId,
    polar_customer_id: polar_customer_id,
    polar_subscription_id: polar_subscription_id,
    polar_checkout_id: polar_checkout_id,
    status: "active",
    plan_id:
      metadata.plan_id || product_price_id || product_id || "professional",
    current_period_start: current_period_start
      ? new Date(current_period_start).toISOString()
      : new Date().toISOString(),
    current_period_end: current_period_end
      ? new Date(current_period_end).toISOString()
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (existingSub) {
    // Update existing subscription
    const { error: updateError } = await supabase
      .from("subscriptions")
      .update(subscriptionData)
      .eq("id", existingSub.id);

    if (updateError) {
      console.error("❌ Error updating subscription:", updateError);
      throw updateError;
    }
    console.log("✅ Updated existing subscription:", existingSub.id);
  } else {
    // Create new subscription
    const { error: insertError } = await supabase
      .from("subscriptions")
      .insert(subscriptionData);

    if (insertError) {
      console.error("❌ Error creating subscription:", insertError);
      throw insertError;
    }
    console.log("✅ Created new subscription");
  }

  console.log("✅ Successfully activated subscription for tenant:", tenantId);
}

async function handleSubscriptionCreated(
  supabase: SupabaseClient,
  data: PolarWebhookData,
) {
  console.log("📝 Handling subscription created:", data.id);

  // Subscription creation is typically followed by subscription.active
  // Just log it for now
  console.log("✅ Subscription created:", {
    subscriptionId: data.id,
    customerId: data.customer_id,
    productId: data.product_id,
    status: data.status,
  });
}

async function handleSubscriptionUpdated(
  supabase: SupabaseClient,
  data: PolarWebhookData,
) {
  console.log("🔄 Handling subscription updated:", data.id);

  const {
    id: polar_subscription_id,
    status,
    current_period_start,
    current_period_end,
    canceled_at,
  } = data;

  // Update subscription status and billing period
  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: status,
      current_period_start: current_period_start
        ? new Date(current_period_start).toISOString()
        : null,
      current_period_end: current_period_end
        ? new Date(current_period_end).toISOString()
        : null,
      canceled_at: canceled_at ? new Date(canceled_at).toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("polar_subscription_id", polar_subscription_id);

  if (error) {
    console.error("❌ Error updating subscription:", error);
    throw error;
  }

  // Also update tenant status based on subscription status
  const { data: subscriptionData, error: fetchError } = await supabase
    .from("subscriptions")
    .select("tenant_id")
    .eq("polar_subscription_id", polar_subscription_id)
    .single();

  if (!fetchError && subscriptionData) {
    let tenantStatus = "active";

    if (status === "active") tenantStatus = "active";
    else if (status === "trialing") tenantStatus = "trialing";
    else if (status === "canceled" || status === "expired")
      tenantStatus = "cancelled";
    else if (status === "past_due" || status === "unpaid")
      tenantStatus = "payment_failed";
    else if (status === "incomplete" || status === "incomplete_expired")
      tenantStatus = "pending_payment";

    await supabase
      .from("tenants")
      .update({
        subscription_status: tenantStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", subscriptionData.tenant_id);

    console.log("✅ Updated tenant status:", tenantStatus);
  }
}

async function handleSubscriptionCanceled(
  supabase: SupabaseClient,
  data: PolarWebhookData,
) {
  console.log("❌ Handling subscription canceled:", data.id);

  const { id: polar_subscription_id, canceled_at, ends_at } = data;

  // Update subscription status to canceled
  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: "cancelled",
      canceled_at: canceled_at
        ? new Date(canceled_at).toISOString()
        : new Date().toISOString(),
      ends_at: ends_at ? new Date(ends_at).toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("polar_subscription_id", polar_subscription_id);

  if (error) {
    console.error("❌ Error updating canceled subscription:", error);
    throw error;
  }

  // Update tenant status
  const { data: subscriptionData } = await supabase
    .from("subscriptions")
    .select("tenant_id")
    .eq("polar_subscription_id", polar_subscription_id)
    .single();

  if (subscriptionData) {
    await supabase
      .from("tenants")
      .update({
        subscription_status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", subscriptionData.tenant_id);

    console.log("✅ Marked tenant as cancelled:", subscriptionData.tenant_id);
  }
}

async function handleSubscriptionRevoked(
  supabase: SupabaseClient,
  data: PolarWebhookData,
) {
  console.log("🚫 Handling subscription revoked:", data.id);

  const { id: polar_subscription_id } = data;

  // Immediate revocation - block access immediately
  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: "cancelled",
      ended_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("polar_subscription_id", polar_subscription_id);

  if (error) {
    console.error("❌ Error revoking subscription:", error);
    throw error;
  }

  // Update tenant to expired status (immediate)
  const { data: subscriptionData } = await supabase
    .from("subscriptions")
    .select("tenant_id")
    .eq("polar_subscription_id", polar_subscription_id)
    .single();

  if (subscriptionData) {
    await supabase
      .from("tenants")
      .update({
        subscription_status: "expired",
        updated_at: new Date().toISOString(),
      })
      .eq("id", subscriptionData.tenant_id);

    console.log("✅ Revoked access for tenant:", subscriptionData.tenant_id);
  }
}

async function handleOrderPaid(
  supabase: SupabaseClient,
  data: PolarWebhookData,
) {
  console.log("💰 Handling order paid:", data.id);

  const { id: polar_order_id, subscription_id, amount, currency } = data;

  // Log successful payment
  console.log(
    `✅ Payment succeeded: ${amount} ${currency} for subscription ${subscription_id}`,
  );

  // Update subscription to active if it has a subscription_id
  if (subscription_id) {
    const { error } = await supabase
      .from("subscriptions")
      .update({
        status: "active",
        updated_at: new Date().toISOString(),
      })
      .eq("polar_subscription_id", subscription_id);

    if (error) {
      console.error("❌ Error updating subscription after payment:", error);
    } else {
      console.log("✅ Activated subscription after payment:", subscription_id);
    }
  }

  // You might want to log this payment in a payments/invoices table
  // This is useful for accounting and reporting
}
