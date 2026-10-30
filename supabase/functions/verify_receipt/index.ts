// STUB — not deployed. Verifies an App Store / Play / PG receipt server-side, then calls grant_order (service role).
// Real payments are disabled until PAYMENT_READY.md is complete. Service key comes from the Edge runtime env only.
import { createClient } from 'npm:@supabase/supabase-js@2';
Deno.serve(async (req) => {
  const { order_id, provider, receipt } = await req.json().catch(() => ({}));
  if (!order_id || !provider || !receipt) return new Response(JSON.stringify({ error: 'bad request' }), { status: 400 });
  if (Deno.env.get('PAYMENTS_ENABLED') !== 'true') return new Response(JSON.stringify({ error: 'payments disabled' }), { status: 503 });
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  // TODO provider verification: Apple verifyReceipt/App Store Server API, Google purchases.products.get, PG (Toss) confirm API
  const verified = false, txId = '';
  if (!verified) return new Response(JSON.stringify({ error: 'unverified' }), { status: 402 });
  await sb.from('payment_transactions').insert({ order_id, provider, provider_tx_id: txId, verified: true, raw: receipt });
  await sb.from('orders').update({ status: 'paid' }).eq('id', order_id).eq('status', 'pending');
  const { data, error } = await sb.rpc('grant_order', { p_order: order_id }); // idempotent
  return new Response(JSON.stringify(error ? { error: error.message } : data), { status: error ? 500 : 200 });
});
