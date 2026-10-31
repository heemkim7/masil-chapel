-- Live 20-user test (h22): 131 msg/s total > Free 100/s. Scale ~N^2 → cap 15 ≈ 74 msg/s (75% of limit).
update public.gate_cfg set cap = 15, low_cap = 6, msg_a = 0.25, msg_b = 0.22 where id = 1;
