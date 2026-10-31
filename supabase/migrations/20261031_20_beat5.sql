-- Admitted heartbeat 5s → abandoned slot expires after 15s (REST only, 0 Realtime msgs; ~0.2 req/s per user).
update public.gate_cfg set live_ttl_s = 15 where id = 1;
