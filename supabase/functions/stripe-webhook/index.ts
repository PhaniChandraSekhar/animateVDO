import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@13.10.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return new Response('No signature', { status: 400 })
  }

  const body = await req.text()

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, endpointSecret)
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`)
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionChange(event.data.object as Stripe.Subscription, supabase)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription, supabase)
        break

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice, supabase)
        break

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice, supabase)
        break

      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session, supabase)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    console.error('Error processing webhook:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

async function handleSubscriptionChange(
  subscription: Stripe.Subscription,
  supabase: any
) {
  const customerId = subscription.customer as string
  
  // Get user by Stripe customer ID
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (userError || !user) {
    console.error('User not found for customer:', customerId)
    return
  }

  // Update or create subscription record
  const subscriptionData = {
    user_id: user.id,
    stripe_subscription_id: subscription.id,
    stripe_customer_id: customerId,
    status: subscription.status,
    price_id: subscription.items.data[0].price.id,
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end,
    canceled_at: subscription.canceled_at 
      ? new Date(subscription.canceled_at * 1000).toISOString() 
      : null,
    updated_at: new Date().toISOString()
  }

  const { error } = await supabase
    .from('subscriptions')
    .upsert(subscriptionData, {
      onConflict: 'stripe_subscription_id'
    })

  if (error) {
    console.error('Error updating subscription:', error)
    throw error
  }

  // Update user's subscription status
  await supabase
    .from('users')
    .update({
      subscription_status: subscription.status,
      subscription_plan: getPlanFromPriceId(subscription.items.data[0].price.id)
    })
    .eq('id', user.id)
}

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  supabase: any
) {
  const customerId = subscription.customer as string
  
  // Get user by Stripe customer ID
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (userError || !user) {
    console.error('User not found for customer:', customerId)
    return
  }

  // Update subscription status to canceled
  await supabase
    .from('subscriptions')
    .update({ 
      status: 'canceled',
      updated_at: new Date().toISOString()
    })
    .eq('stripe_subscription_id', subscription.id)

  // Update user to free plan
  await supabase
    .from('users')
    .update({
      subscription_status: 'canceled',
      subscription_plan: 'hobby'
    })
    .eq('id', user.id)
}

async function handlePaymentSucceeded(
  invoice: Stripe.Invoice,
  supabase: any
) {
  // Record successful payment
  const paymentData = {
    stripe_invoice_id: invoice.id,
    stripe_customer_id: invoice.customer as string,
    amount: invoice.amount_paid,
    currency: invoice.currency,
    status: 'succeeded',
    created_at: new Date(invoice.created * 1000).toISOString()
  }

  await supabase
    .from('payments')
    .insert(paymentData)
}

async function handlePaymentFailed(
  invoice: Stripe.Invoice,
  supabase: any
) {
  // Record failed payment
  const paymentData = {
    stripe_invoice_id: invoice.id,
    stripe_customer_id: invoice.customer as string,
    amount: invoice.amount_due,
    currency: invoice.currency,
    status: 'failed',
    created_at: new Date(invoice.created * 1000).toISOString()
  }

  await supabase
    .from('payments')
    .insert(paymentData)

  // Send notification to user about failed payment
  // In production, this would trigger an email
}

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  supabase: any
) {
  if (session.mode === 'subscription') {
    // Update user with Stripe customer ID if this is their first subscription
    const { error } = await supabase
      .from('users')
      .update({ 
        stripe_customer_id: session.customer,
        updated_at: new Date().toISOString()
      })
      .eq('email', session.customer_email)

    if (error) {
      console.error('Error updating user with Stripe customer ID:', error)
    }
  }
}

function getPlanFromPriceId(priceId: string): string {
  // Map Stripe price IDs to plan names
  const priceIdMap: Record<string, string> = {
    [Deno.env.get('STRIPE_PRO_PRICE_ID') || 'price_pro_monthly']: 'pro',
    [Deno.env.get('STRIPE_ENTERPRISE_PRICE_ID') || 'price_enterprise_monthly']: 'enterprise'
  }
  
  return priceIdMap[priceId] || 'hobby'
}