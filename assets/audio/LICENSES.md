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


## Rest mode library ('그냥 앉아 있기') — assets/audio/rest/
Own recordings rendered on the box (2026-10-31): MIDI/score data → original arrangement (slowed tempo, re-voiced for piano/organ/strings)
→ original numpy additive synthesis + synthetic hall reverb (tools/rest_music/; FluidSynth was unavailable, so **no soundfont or sampled
instruments were used**). No third-party recordings. Mastered to −18 LUFS integrated (true peak ≤ −2 dBFS), 128 kbps MP3, 1.5 s fade-in / 5 s fade-out.
All score MIDIs are kept in tools/rest_music/mid/ with their Commons source pages below. Manifest: assets/audio/rest/manifest.json.

| File | Title | Composer, year | Licence basis |
|---|---|---|---|
| rest/01_bethany.mp3 | 내 주를 가까이 하게 함은 — Nearer, My God, to Thee (tune BETHANY) | Lowell Mason (1792–1872), 1856 | Composition public domain (composer d. 1872, >70 years); score source: https://commons.wikimedia.org/wiki/File:Nearer_my_god_to_thee.MID [Public domain (Commons)]; recording: own render (additive synth, no samples), CC0 1.0 |
| rest/02_stille.mp3 | 고요한 밤 거룩한 밤 — Stille Nacht, heilige Nacht | Franz Xaver Gruber (1787–1863), 1818 | Composition public domain (composer d. 1863, >70 years); score source: https://commons.wikimedia.org/wiki/File:Stille_Nacht,_heilige_Nacht.mid [CC0 1.0]; recording: own render (additive synth, no samples), CC0 1.0 |
| rest/03_toplady.mp3 | 만세 반석 열리니 — Rock of Ages (tune TOPLADY) | Thomas Hastings (1784–1872), 1830 | Composition public domain (composer d. 1872, >70 years); score source: https://commons.wikimedia.org/wiki/File:Rock_of_Ages_(Hastings_tune).mid [CC0 1.0]; recording: own render (additive synth, no samples), CC0 1.0 |
| rest/04_itiswell.mp3 | 내 평생에 가는 길 — It Is Well with My Soul (tune VILLE DU HAVRE) | Philip P. Bliss (1838–1876), 1876 | Composition public domain (composer d. 1876, >70 years); score source: https://commons.wikimedia.org/wiki/File:It_Is_Well_with_My_Soul.mid [CC0 1.0]; recording: own render (additive synth, no samples), CC0 1.0 |
| rest/05_garden.mp3 | 저 장미꽃 위에 이슬 — In the Garden (tune GARDEN) | C. Austin Miles (1868–1946), 1912 | Composition public domain (composer d. 1946, >70 years); score source: https://commons.wikimedia.org/wiki/File:IntheGarden.MID [Public domain (Commons)]; recording: own render (additive synth, no samples), CC0 1.0 |
| rest/06_largo.mp3 | 라르고 (옴브라 마이 푸) — Largo – 'Ombra mai fù' from Serse, HWV 40 | George Frideric Handel (1685–1759), 1738 | Composition public domain (composer d. 1759, >70 years); score source: https://commons.wikimedia.org/wiki/File:Largo_(Händel).mid [CC0 1.0]; recording: own render (additive synth, no samples), CC0 1.0 |
| rest/07_wachet.mp3 | 깨어라, 부르는 소리 있도다 — Wachet auf, ruft uns die Stimme | Philipp Nicolai (1556–1608), 1599 | Composition public domain (composer d. 1608, >70 years); score source: https://commons.wikimedia.org/wiki/File:Wachet_auf,_ruft_uns_die_Stimme.mid [CC0 1.0]; recording: own render (additive synth, no samples), CC0 1.0 |
| rest/08_nundanket.mp3 | 다 감사드리세 — Nun danket alle Gott | Johann Crüger (1598–1662), 1647 | Composition public domain (composer d. 1662, >70 years); score source: https://commons.wikimedia.org/wiki/File:Nun_danket_alle_Gott_(EG,_spätere_Form).mid [CC0 1.0]; recording: own render (additive synth, no samples), CC0 1.0 |
| rest/09_festeburg.mp3 | 내 주는 강한 성이요 — Ein feste Burg ist unser Gott | Martin Luther (1483–1546), 1529 | Composition public domain (composer d. 1546, >70 years); score source: https://commons.wikimedia.org/wiki/File:Ein_feste_Burg_ist_unser_Gott_(EG_362_spätere_Form).mid [CC0 1.0]; recording: own render (additive synth, no samples), CC0 1.0 |
| rest/10_gordon.mp3 | 내 주 되신 주를 참 사랑하고 — My Jesus, I Love Thee (tune GORDON) | Adoniram J. Gordon (1836–1895), 1876 | Composition public domain (composer d. 1895, >70 years); score source: https://commons.wikimedia.org/wiki/File:My_Jesus,_I_Love_Thee.mid [CC0 1.0]; recording: own render (additive synth, no samples), CC0 1.0 |
| rest/11_passion.mp3 | 오 거룩하신 주님 (수난 코랄) — Passion Chorale 'O Haupt voll Blut und Wunden' (St Matthew Passion BWV 244 no. 62) | Hans Leo Hassler (1564–1612), harm. J. S. Bach (1685–1750), 1601 | Composition public domain (composer d. 1750, >70 years); score source: music21 bundled Bach chorale corpus (bach/bwv244.62) – edition of a 1727 score [Public domain composition/score data]; recording: own render (additive synth, no samples), CC0 1.0 |
| rest/12_canon.mp3 | 파헬벨 캐논 (묵상) — Canon in D (ground & canon lines) – free meditation arrangement | Johann Pachelbel (1653–1706); variations original, 1694 | Composition PD (Pachelbel d. 1706); ground-bass ref Commons PD MIDI; added variations original; own render CC0 1.0 |
| rest/13_pad_stillwater.mp3 | 잔잔한 물가 (묵상 패드) — Still Water – original meditation pad | 마실채플 original (generated, 2026), 2026 | Original composition, dedicated CC0 1.0 |
| rest/14_pad_morninglight.mp3 | 아침 빛 (묵상 패드) — Morning Light – original meditation pad | 마실채플 original (generated, 2026), 2026 | Original composition, dedicated CC0 1.0 |

Excluded from the rest library:
- 주 하나님 지으신 모든 세계 (How Great Thou Art): the Swedish folk melody (O store Gud, 1885/1891) is PD, but the familiar form/harmonisation and English text are Stuart K. Hine (1949, d. 1989) and still copyrighted; no clean PD/CC0 score source of the bare melody — excluded as uncertain.
- 내 영혼이 은총 입어, 피난처 있으니: could not verify the tune composer/date reliably in this pass — excluded.
- 예수 사랑하심은 (JESUS LOVES ME, Bradbury d. 1868): PD, but no CC0/PD score file found on Commons; not transcribed from memory to avoid melodic errors — candidate for later.
- Bach 'Jesu, Joy of Man's Desiring', 'Air on the G string': PD, but no CC0 score source located — later candidates.
- Finlandia (Sibelius d. 1957): not PD under life+70.
- Commons 'Näher, mein Gott, zu dir.mid' (CC BY 3.0): skipped in favour of the PD 'Nearer my god to thee.MID'.
Already in the chapel set (not duplicated): Old Hundredth, St. Anne, Amazing Grace (New Britain), Nicaea (거룩 거룩 거룩).
