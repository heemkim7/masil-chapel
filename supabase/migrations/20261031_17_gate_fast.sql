-- Faster refill/expiry: admitted heartbeat 10s → expire after 30s; waiters poll 5s → expire after 15s. gate_leave frees a slot at once.
update public.gate_cfg set live_ttl_s = 30, wait_ttl_s = 15 where id = 1;
