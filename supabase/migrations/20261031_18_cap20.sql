-- Re-measured after 1Hz/0.5Hz sync (h22): 10 users = 34.7 msg/s total (0.13 out, 1.02 in /user/s). Safe cap 20 (~45 msg/s est, 55% headroom).
update public.gate_cfg set cap = 20, low_cap = 8, msg_a = 0.15, msg_b = 0.12 where id = 1;
