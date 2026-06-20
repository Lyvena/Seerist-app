import { createClient } from "https://esm.sh/@insforge/sdk@latest"
import { Stripe } from "https://esm.sh/stripe@17.7.0"

const insforge = createClient({
  baseUrl: Deno.env.get("INSFORGE_URL")!,
  apiKey: Deno.env.get("INSFORGE_API_KEY")!,
})

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2025-02-24.acacia",
})

interface WebhookPayload {
  provider: string
  environment: string
  event_type: string
  provider_event_id: string
  payload: Record<string, unknown>
  processing_status: string
}

Deno.serve(async (req: Request) => {
  try {
    const signature = req.headers.get("stripe-signature")
    if (!signature) {
      return new Response("Missing signature", { status: 401 })
    }

    const body = await req.text()
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")
    if (webhookSecret) {
      try {
        stripe.webhooks.constructEvent(body, signature, webhookSecret)
      } catch {
        return new Response("Invalid signature", { status: 401 })
      }
    }

    const event = JSON.parse(body)

    const { data: eventData } = await insforge.database
      .from("payments_webhook_events")
      .select("id")
      .eq("provider_event_id", event.id)
      .maybeSingle()

    if (eventData) {
      return new Response("Already processed", { status: 200 })
    }

    const environment = Deno.env.get("STRIPE_ENVIRONMENT") ?? "test"

    let subjectType: string | undefined
    let subjectId: string | undefined

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object
        subjectType = session.metadata?.insforge_subject_type ?? session.metadata?.subject_type
        subjectId = session.metadata?.insforge_subject_id ?? session.metadata?.subject_id

        if (session.mode === "subscription" && subjectId) {
          const { data: customerMapping } = await insforge.database
            .from("payments_customer_mappings")
            .select("subject_id, subject_type")
            .eq("provider_customer_id", session.customer)
            .maybeSingle()

          if (customerMapping) {
            subjectType = (customerMapping as Record<string, string>).subject_type
            subjectId = (customerMapping as Record<string, string>).subject_id
          }
        }
        break
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object
        subjectType = sub.metadata?.insforge_subject_type ?? sub.metadata?.subject_type
        subjectId = sub.metadata?.insforge_subject_id ?? sub.metadata?.subject_id

        if (!subjectId) {
          const { data: cm } = await insforge.database
            .from("payments_customer_mappings")
            .select("subject_id, subject_type")
            .eq("provider_customer_id", sub.customer)
            .maybeSingle()
          if (cm) {
            const mapping = cm as Record<string, string>
            subjectType = mapping.subject_type
            subjectId = mapping.subject_id
          }
        }

        if (subjectId) {
          const priceId = sub.items?.data?.[0]?.price?.id
          let plan = "free"
          if (priceId?.includes("pro")) plan = "pro"
          if (priceId?.includes("agency")) plan = "agency"

          await insforge.database
            .from("subscriptions")
            .upsert({
              user_id: subjectId,
              plan,
              status: sub.status,
              payment_provider_id: sub.id,
              current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
              current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
              cancel_at_period_end: sub.cancel_at_period_end ?? false,
            })

          await insforge.database
            .from("profiles")
            .update({ plan, updated_at: new Date().toISOString() })
            .eq("id", subjectId)
        }
        break
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object
        subjectType = sub.metadata?.insforge_subject_type
        subjectId = sub.metadata?.insforge_subject_id

        if (!subjectId) {
          const { data: cm } = await insforge.database
            .from("payments_customer_mappings")
            .select("subject_id")
            .eq("provider_customer_id", sub.customer)
            .maybeSingle()
          if (cm) subjectId = (cm as Record<string, string>).subject_id
        }

        if (subjectId) {
          await insforge.database
            .from("subscriptions")
            .update({ status: "canceled", cancel_at_period_end: true, updated_at: new Date().toISOString() })
            .eq("payment_provider_id", sub.id)
        }
        break
      }

      case "invoice.paid": {
        const invoice = event.data.object
        subjectId = invoice.metadata?.insforge_subject_id ??
          invoice.subscription_details?.metadata?.insforge_subject_id

        await insforge.database
          .from("payments_transactions")
          .upsert({
            provider: "stripe",
            environment,
            provider_event_id: event.id,
            amount: invoice.amount_paid,
            currency: invoice.currency,
            status: "paid",
            invoice_url: invoice.hosted_invoice_url,
            provider_customer_id: invoice.customer,
            provider_subscription_id: invoice.subscription,
            subject_id: subjectId,
            subject_type: subjectType,
          })
        break
      }

      case "invoice.payment_failed": {
        const failedInvoice = event.data.object
        const subId = failedInvoice.subscription

        if (subId) {
          await insforge.database
            .from("subscriptions")
            .update({ status: "past_due", updated_at: new Date().toISOString() })
            .eq("payment_provider_id", subId)
        }
        break
      }
    }

    await insforge.database
      .from("payments_webhook_events")
      .upsert({
        provider: "stripe",
        environment,
        event_type: event.type,
        provider_event_id: event.id,
        payload: event,
        processing_status: "processed",
      })

    return new Response("OK", { status: 200 })
  } catch (err) {
    console.error("Webhook error:", err)
    return new Response("Internal error", { status: 500 })
  }
})
