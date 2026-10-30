// STUB — not deployed. Store server notifications (refund / revoke) → refund_order clawback (idempotent).
import { createClient } from 'npm:@supabase/supabase-js@2';
Deno.serve(async (req) => {
  if (Deno.env.get('PAYMENTS_ENABLED') !== 'true') return new Response('disabled', { status: 503 });
  // TODO verify signature (Apple JWS / Google Pub/Sub token / PG HMAC) before trusting the body
  const ev = await req.json().catch(() => null); if (!ev?.order_id || ev.type !== 'refund') return new Response('ignored');
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data, error } = await sb.rpc('refund_order', { p_order: ev.order_id, p_reason: String(ev.reason || 'store refund') });
  return new Response(JSON.stringify(error ? { error: error.message } : data), { status: error ? 500 : 200 });
});
