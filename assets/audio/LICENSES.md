# Audio licenses — 마실채플

All hymn tracks are instrumental pipe-organ renderings made locally from public-domain / CC0 MIDI scores
on Wikimedia Commons (rendered with a custom additive organ synth + chapel reverb; no third-party samples).
The melodies are all public-domain hymn tunes (composers died >70 years ago). The synthesized fallback in
js/audio.js is original code.

| File | Tune | Source score (Wikimedia Commons) | Score license |
|---|---|---|---|
| old100.mp3 | Old Hundredth (Bourgeois, 1551) | https://commons.wikimedia.org/wiki/File:Old100.mid (uploader Hyacinth) | Public domain |
| newbrit.mp3 | New Britain / Amazing Grace | https://commons.wikimedia.org/wiki/File:Amazing_grace_(org).mid | CC0 1.0 |
| nicaea.mp3 | Nicaea (Dykes, 1861) "Holy, Holy, Holy" | https://commons.wikimedia.org/wiki/File:Nicaea_(hymn_tune).mid (Rabanus Flavus) | CC0 1.0 |
| joy.mp3 | Antioch "Joy to the World" | https://commons.wikimedia.org/wiki/File:Joy_to_the_World_(Freue_dich,_Welt).mid | CC0 1.0 |
| stanne.mp3 | St. Anne (Croft, 1708) | https://commons.wikimedia.org/wiki/File:St._Anne_(tune).mid | CC0 1.0 |

Rejected (not CC0/PD): Commons "Amazing Grace-organ.ogg" (CC BY-SA 2.5), "Holy, Holy, Holy.ogg" (CC BY-SA 4.0), "Thine Be The Glory" (CC BY 3.0).

Excluded: Finlandia (Sibelius, d. 1957) — the MIDI score is CC0 but the composition is not yet public domain under life+70 (Korea/EU), so it is not shipped.

## Plaza ambient (outdoor BGM)
| File | Title | Source | License |
|---|---|---|---|
| plaza.mp3 | "Plaza Morning" (마실 광장의 아침) — original 60 s ambient pad + pentatonic bells loop (Cmaj7–Am7–Fmaj7–Gsus) | Composed and rendered from code for this project: tools/gen_plaza.py (numpy additive synth, tail wrapped for a seamless loop), encoded with ffmpeg/LAME 112k | CC0 1.0 (original work, dedicated to the public domain) — no third-party samples or scores |
Played via a sample-exact WebAudio loop at ~35% of chapel BGM loudness (matched mean loudness −15.6 dB vs old100 −15.5 dB).
