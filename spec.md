# Lāčplēsis (Bearslayer) — game spec

## Summary

A simple top-down, scrollable 2D browser game for a 6-year-old. Lāčplēsis travels around Latvia: a map of the whole country shows small **locations**, a few per novads, and each one is a little playable place (a couple of meadows, some trees or a piece of forest, sometimes a lake, the sea or a big bridge). In each location he grows stronger, beats enemies whose number is smaller than his, and beats the location's boss, which opens a golden chest and the next locations on the map. In the final battle he beats the Black Knight (Melnais bruņinieks) in Rīga.

The game has no death, no game over and no timer. If an enemy is too strong, Lāčplēsis just bounces back, and the way forward is always the same: go collect more blue numbers.

## Tech

- Browser, client-only JavaScript, one canvas, no dependencies or build step. Same setup as `heart_ball`: `index.html` and `game.js`, with all art drawn using canvas calls.
- Game name: **Lāčplēsis**. All in-game text is in Latvian, with an English translation picked by an LV / EN switch in the title screen's corner (remembered; Latvian is the default; in English the hero is called Bearslayer and proper names such as Daugava, Kurbads or Jods stay Latvian). Text is kept short and always comes with an icon, because the player may read slowly (but can read and should be encouraged to occasionally do so). Text stays up long enough to read: banners, speech bubbles and words that float up ("Atrodi ieroci!") all show for 8 s, while plain numbers flash by in about 1 s. After a golden chest opens new places, the map opens 2 s later, so it's clearly the reward for that fight.
- Progress (strength, beaten bosses, opened golden chests and the current location) is saved in `localStorage` automatically, so a child can close the tab and keep going later.

## Core mechanic: strength numbers

- **Every character has a number above its head**, drawn large and bold with an outline so it is readable on any background.
  - **Blue** is for Lāčplēsis, his allies and anything that helps (pickups, chests, friendly NPCs).
  - **Red** is for enemies 
  - **Yellow/white** is enemies that have some debuffs applied.
  - Because colour no longer says "you can beat it", an enemy weaker than Lāčplēsis **trembles and shows a sweat drop** instead. The child doesn't have to compare numbers.
- **Blue digits only appear in a small circle around the magic spring** in the Lielvārde meadows, Lāčplēsis's home location (about 10 of them). They respawn slowly (one every 8 s), and each is worth about 0.5% of his strength (at least 1), so going home is always a way to top up. Everywhere else, strength grows only by beating enemies, and **never goes above 999**: the closer Lāčplēsis gets to 1000, the less each win gives him. Enemy and boss numbers are capped at 999 too.
- **Weapons lie around the labyrinth** instead, glowing blue so they stand out. Walking over one picks it up; it lasts a while, like the items from chests. Items are **minor** (sword, helmet, shield, boots) or **major** (iron club, Pērkons's axe, chain mail, Spīdola's broom, sleep flute). What lies on the ground is mostly minor, about one in seven major; chests and tautumeitas always give a major one.
- **Touching a weaker enemy:** the enemy goes "poof" into stars and runs off the screen (nothing gory). Lāčplēsis gains **about 3.5%** of the enemy's number. Strength keeps fractions: the number shown only goes up once a whole one has been gathered, and until then a win shows just a small "+".
- **Strength very slowly drains away** (about 0.1% of it per second). The drain never takes him below **half of the best strength he has ever had**, or below 5. Swimming and burning are separate costs and can take him lower. The number visibly ticks down, so he has to keep beating enemies (the spring and the bonfires bring it back up), and can't just get strong once and coast. Sprīdītis (see Helpers' houses) stops the drain for a while.
- **Everything scales with Lāčplēsis.** Each enemy has a fixed strength *relative* to him: about a third are clearly weaker, a third are close, and a third are clearly stronger. Its number is worked out from his current strength when it spawns, and again whenever it's out of sight. While an enemy is on screen its number stays put, so picking up a weapon nearby really does let him beat it. Bosses scale the same way, but are stronger than him (see Bosses).
- Weapons multiply his number without rounding it down, so a 5 with a sword (7.5) beats a 7.
- **Touching a stronger enemy (or an equal one):** Lāčplēsis is **pushed back** with a soft "boing", a few stars, and a short blink during which he can't be bumped again (about 1 second). He loses **no** strength. That's all.
- **Hint helper:** after 3 bumps in a row against stronger enemies, a small blue arrow appears for a few seconds, pointing to the nearest weapon lying on the ground. If it says anything, it's "Atrodi ieroci!" ("Find a weapon!").

## Going back always helps

- Weapons, enemies and chests **respawn in the location he is in**, and any open location can be visited again from the map, so going back is always a valid way to get stronger.
- Lielvārdes pļavas, the home location, has a **blue spring (avotiņš)**. Stepping into it brings strength back up to the best it has ever been, then it rests for 30 s (it stops glowing).

## Hero

- **Lāčplēsis**: a young man with **bear ears** (the source of his strength in the legend), a simple tunic and a belt. When his strength rises, the ears glow briefly.
- Controls:
  - Arrow keys / WASD to move.
  - **Click or tap** to walk there, using pathfinding around obstacles as in `heart_ball`. Pathfinding only takes short detours; if the way round is much longer than a straight line, he walks straight and stops at the wall. Otherwise a tap would solve the labyrinth.
  - **Touch must cover everything**: moving, closing popups, the map, and restarting after the ending. A 6-year-old will likely be on a tablet. No other buttons are needed to play.
- He doesn't attack. Fights happen only by walking into enemies, so there is just one action to understand: walking.
- He carries whatever gear he has from chests: a sword, club or axe in his hand, a shield on his arm, red-cuffed boots, or Spīdola's broom to ride.

## World: Latvia and its locations

### The map of Latvia

- The **map screen** shows the whole of Latvia with its real shape, from Natural Earth data (public domain, 1:10m, lightly simplified): the Baltic Sea and the Gulf of Riga with the coast, the neighbouring countries (with Saaremaa), the rivers **Daugava**, **Gauja**, **Venta** and **Lielupe**, the bigger lakes, and the regions in their colours. Region borders follow the municipalities (Sēlija and the Rīga area assigned by hand). The data is generated into compact arrays at the top of `game.js`.
- Every **location is a pin** on the map. Open pins show the boss's face (a crown for a vadonis, the bear, Jods), beaten ones a ✔, closed ones a lock. Roads join each location to the ones it opens: dashed while closed, solid red once the way is open. A blue star marks where Lāčplēsis is.
- **Tapping a pin** shows a card at the bottom: the location's name, its novads and region, and either "Doties ceļā!" with a big green ▶ (or tap the same pin again), "Tu esi šeit", or, for a closed one, "Vispirms uzvari: …" naming the place that opens it. A red ✖ closes the map. Keys: arrows step through open places, Enter goes, M or Esc closes.
- The map opens from the **minimap** (it has a small map badge), the **M key**, or the **signpost** ("Karte") that stands next to where Lāčplēsis arrives in every location: he walks away from it and back into it.
- After a golden chest opens new places, the map opens by itself a few seconds later, with the new pins glowing.
- Sēlija and Rīga are shown but have no locations yet ("drīzumā").

### Locations

- Each location is small: about 2600 × 1800 px, a couple of screens across. It is ringed by a thick belt of forest (or the sea), so there's nothing to get lost in beyond it. That edge forest can't be burnt: pushing into it (or tapping it close by) shows "Šis mežs par biezu!" ("This forest is too thick!") instead of the burn question.
- Its parts, placed by hand per location and fixed every game so they can be learned:
  - **meadows** with flowers (reeds in Latgale) and small **copses** of trees,
  - big **crop fields**, some with haystacks: wheat and rye, mostly in Zemgale, blue flax in Latgale. They are just ground and can be walked over,
  - one or two **forest sections**, each a small **labyrinth**: corridors walled with the region's trees (spruces, pines and birches in Vidzeme, leafy trees and orchards in Zemgale, birches in Latgale, and pine forests along the sea coast). Spruces (egles) are layered dark cones; Scots pines (priedes) have tall orange trunks with flat clumps of needles at the top, with loops and a few ways in from the meadows. Chests like to sit in its dead ends,
  - sometimes a **river** with a wide wooden bridge on log piles with log railings, or a **big bridge**: a broad stone or red-brick bridge on piers, with arches, parapets, lamps and stone ends on both banks (the Daugava at Krāslava, the canal in Liepāja, and Kuldīga's brick bridge over the Venta next to the Ventas rumba waterfall),
  - sometimes a **lake** or the **sea coast** with a sandy beach. Lakes can be turned ovals. Lakes and rivers carry their names on the water (Daugava, Gauja, Venta, Alauksts, Burtnieks, …); a river's name is written along it every so often, away from bridges,
  - sometimes an **island**, reached only by swimming or the broom, with gifts that come back 90 s after they're taken: a wooded island in Inesis with chain mail, and the Kolka lighthouse's island at the end of the *sēre*, a broad shallow reef (lighter water) running north-east from the cape, with a wide mouth at the cape's tip and shallow water all round the island, that can be swum. The lighthouse island always has four major items: the iron club, Pērkons's axe, chain mail and Spīdola's broom (handy for flying back),
  - **swamps (purvi)**: a few patches of boggy, olive-brown ground with reeds, tussocks and dark puddles beside lakes and rivers, never near the sea (more of them in Latgale). They can be walked through, but at half speed (enemies too); over them float a few *maldugunis* (will-o'-the-wisps: pale green-blue flickering lights with a little face and a trail of sparks, one for every 70 or so swamp cells, at most 3), ordinary enemies with a number that never leave the swamp and aren't slowed by it; stepping in says "Purvs! Lēni..." with a squelch. Tap routes go round a swamp when that's only a short way longer, and the broom flies over at full speed,
  - sometimes a **landmark** building that he walks around: Cēsis and Koknese castles, Turaida's red brick castle, Rundāle palace, the Gaiziņkalns lookout tower, the Kolka lighthouse; or a small village.
- Open clearings surround the start, the boss, helpers' houses, bridges and landmarks. Rivers, lakes and forest walls work as before: **swimming** (asks "Peldēt?" first, strength drops 1.5% a second, down to 1), **burning the forest** (pushing into trees for a moment, straight or at an angle, or tapping trees up to about 420 px away, where a tap on a treetop counts as its trunk; shows "Dedzināt mežu?" in a big panel on the left side (about 480 × 270 px) with ✔ and ✖, without stopping the game; the camera shifts so Lāčplēsis stays visible to its right (a flame marks the spot; the panel goes away by itself after 6 s or if he walks off; Enter/Y and N/Esc answer it too), costs 3%, opens a gap about 120 px across, trees grow back after 90 s), and **Spīdola's broom** flies over both. He can never get stuck.
- Each location has about 11 ordinary enemies, 5 weapons lying around and 3 chests, refilled over time while he is there, and **one boss**. Weapons and chests never lie within about 550 px of the boss, so they have to be found and brought to the fight. Beating the boss drops a **golden chest**; opening it gives a permanent +1% strength (at least 1) and opens the next locations.
- A small minimap of the location sits in the top right, with its name under it.

## Locations and order

Each place is laid out roughly like the real one: rivers, lakes, castles and towns are on the right sides of each other (north is up), squeezed to fit the play area, and each pin sits at its real spot on the map (Tērvete forest and hillfort, really side by side, are pulled a little apart so both pins can be tapped).

| Region | Location (novads) | What's there | Boss | Opens |
|---|---|---|---|---|
| Vidzeme | **Lielvārdes pļavas** (Ogres n.) — start | spring, village on the Daugava's north-east bank, a forest | wolf vadonis | Zilie kalni, Kokneses pilsdrupas |
| | Zilie kalni (Ogres n.) | Kurbads's house, a chain of pine ridges with a lookout tower, the Ogre river and a bridge on the town side to the south-east | imp vadonis | Turaidas pils, Cēsu pils |
| | Kokneses pilsdrupas (Aizkraukles n.) | castle ruins on the Daugava's north bank, the Pērse flowing in from the north with a bridge, Koknesis's house | wolf vadonis | Turaidas pils, Cēsu pils |
| | Turaidas pils (Siguldas n.) | red brick castle on the Gauja's north-west bank; Lāčplēsis starts on the Sigulda side and crosses a bridge | **Lielais lācis** | Rundāles dārzs, Tērvetes mežs (Zemgale) |
| | Cēsu pils (Cēsu n.) | stone castle, the old town south-west of it, the castle park pond, the Gauja to the west | wolf vadonis | Vecpiebalgas ezeri |
| | Vecpiebalgas ezeri (Cēsu n.) | the village east of its lakes: big oval Alauksts to the north-north-west, small overgrown Tauns to the west (with swamps), Inesis with its bays to the south-south-west, a ditch and the Pīle joining them with two bridges | imp vadonis | Burtnieku ezers, Gaiziņkalns |
| | Gaiziņkalns (Madonas n.) | Latvia's highest hill with a wooden lookout tower, a small lake, forests | wolf vadonis | Lubāna klāni |
| | Burtnieku ezers (Valmieras n.) | Burtnieks, a long lake running north to south, with Burtnieki village on its south-east shore | wolf vadonis | — |
| Zemgale | Rundāles dārzs (Bauskas n.) | the palace, Paija, an orchard labyrinth | vadātājs vadonis | Tērvetes mežs |
| | Tērvetes mežs (Dobeles n.) | a big forest, Sprīdītis's house | **Trīsgalvainais Jods** | Ventas rumba (Kurzeme) |
| Kurzeme | Ventas rumba (Kuldīgas n.) | the waterfall, the long brick bridge, old town | crayfish vadonis (*Vēžu ķēniņš*) | Liepājas kanāls, Jūrkalnes krasts |
| | Liepājas kanāls (Liepāja, valstspilsēta) | sea and beach, Liepāja lake, the canal with a big bridge | crayfish vadonis | Jūrkalnes krasts |
| | Jūrkalnes krasts (Ventspils n.) | sea coast with a beach | seagull vadonis | Kolkasrags |
| | Kolkasrags (Talsu n.) | a cape where the Baltic and the Gulf of Riga meet; the lighthouse on its island at the end of a swimmable reef, with four major items | **Sešgalvainais Jods** | Krāslavas tilts (Latgale) |
| Latgale | Krāslavas tilts (Krāslavas n.) | big bridge over the Daugava, Krāslava town on the north bank | swamp spirit vadonis | Rāznas ezers |
| | Rāznas ezers (Rēzeknes n.) | the big oval lake, with Mākoņkalns and its castle ruins to the south-west | imp vadonis | Lubāna klāni |
| | Lubāna klāni (Madonas n.) | Lubāns, Latvia's biggest lake, runs from beyond the top edge far down the middle, just east of the start, taller than it is wide, so it can't be passed in the north. Ragana lives on its far, east shore. South of it the klāni, round flooded bogs with the Nagļi fish ponds, reach to the bottom edge, so the way to her is a long swim across Lubāns or a wade round through the bog (at half speed, past the maldugunis) | **Ragana** (the witch) | — |
| Final | **Tērvetes pilskalns** (Dobeles n.) | the hillfort on the east bank of the Tērvete, a bridge over it | **Deviņgalvainais Jods** | — (the ending) |

- Ordinary enemies by region: Vidzeme wolves and imps (velni), Zemgale geese and *vadātāji* (the forest spirits of Latvian belief that lead people astray, so they walk in circles: small mossy creatures of twigs and bark with branch antlers, leaf tufts and glowing yellow-green eyes, beckoning with a twig arm), Kurzeme river crayfish (vēži, olive-brown as they are alive) and wolves, with seagulls (kaijas) in the seaside places instead of crayfish (Liepāja has all three), Latgale swamp spirits (purva gariņi) and imps. Later regions are a little harder (Zemgale ×1.15, Kurzeme ×1.25, Latgale ×1.35 on enemy strength).
- More locations can be added by adding an entry to `LOCATIONS` in `game.js` (position on the map, novads, start, forests, river, lakes, sea, landmark, boss and which locations it opens).
- **Each region has a main boss**: the Great Bear (Turaida, Vidzeme), the three-headed Jods (Tērvetes mežs, Zemgale), the six-headed Jods (Kolkasrags, Kurzeme) and Ragana (Lubāna klāni, Latgale). A region counts as done once its main boss's golden chest is open; its other places are optional.
- **The final place, Tērvetes pilskalns**, opens only when all four regions are done. On the map it is joined to each main boss by a road, and while closed its card lists the main bosses still to beat. The nine-headed Jods waits there, and opening his golden chest shows the ending.
- Rīga and the Black Knight come later.

## Bosses

- **A vadonis** (chief) guards most locations: a big version of one of the region's ordinary enemies, wearing a small golden crown, 1.23× Lāčplēsis's strength times the region's hardness, and 20% more in a place where a helper lives (Zilie kalni, Koknese), since the helper is right there. He wanders a little near his clearing and runs off when beaten. Some vadoņi (the wolves at Koknese, Cēsis, Gaiziņkalns and Burtnieki, and the imp at Zilie kalni) live in a **lair**: a small clearing at the centre of a forest labyrinth. A lair's maze has no loops, its walls have no gaps, and it has only two ways in, placed as far along the maze from the clearing as they can be, so reaching him means finding the way through (or burning one).
- **Jods bosses have one number per head**, not one big number. Lāčplēsis beats the heads **one at a time**, and each head he beats adds part of its number to his strength, so beating the weakest head first helps him get strong enough for the next one. This is the main "strategy" in the game, and it stays visual: a head he can beat now trembles, and a debuffed head turns yellow (see Buffs and debuffs). When all the heads are beaten, Jods is defeated.
- **Every Jods is a giant (milzis)**, not a dragon: a huge farmhand in a linen shirt with an embroidered collar, a red-and-white woven belt, leg wraps and bast shoes, with bearded heads and a club, dressed for his place and a little bigger each time:
  - **Trīsgalvainais Jods** (Tērvete forest), about 2.6 times Lāčplēsis's height: moss-green shirt, three heads (an oak-leaf wreath on the middle one), a knobbly oak club, the only giant without iron.
  - **Sešgalvainais Jods** (Kolkasrags), 1.14 times bigger: a sea giant in a blue-grey shirt with a fishing net over his shoulders, six heads with sandy and salt-white beards and knitted caps, and an iron morningstar crusted with barnacles.
  - **Deviņgalvainais Jods** (Tērvetes pilskalns), 1.28 times bigger: a hillfort giant in a red woollen cloak with a bronze brooch, nine heads, Semigallian iron helmets on every other one, and a morningstar in each hand, swung in turn (for the far one he turns round, so it's always the arm on Lāčplēsis's side).
- All of them: He turns to face Lāčplēsis. Touching his body fights a head Lāčplēsis can beat if there is one (so pushing into him never bumps him off a strong head while a weaker one waits), otherwise the nearest head. A beaten head droops **dizzy**, with swirly eyes and little stars circling it, and when its time is up it shakes itself awake ("Galva atjēdzās!"); a head put to sleep by the flute shuts its eyes instead, so dizzy and asleep never look alike. When he is beaten he sits down with a thump, every head dizzy and the club on the ground, then gets up and stomps off. The "Ātrāk, galvas atjēdzas!" ("Quick, the heads are coming round!") words disappear at once. The Jods icon on the map pins, the place card and the banners is the giants' iron morningstar.
- **Lielais lācis, Ragana and Melnais bruņinieks** have a single number. Ragana (1.5× his strength) flies slowly in circles over her clearing at Lubāns and every 3 s drops a red decoy star. These are not harmful: touching one just makes it pop with a giggle.
- **Melnais bruņinieks** has three armour pieces (helmet, shield, armour), each with its own number, which Lāčplēsis knocks off one at a time in the same way as Jods's heads. Then the knight himself is left with a small number.
- **Nothing is stronger than the boss.** While a place's boss is unbeaten, no creature there is stronger than it (for Jods, than his strongest head). A creature that would be is not made weaker: it is rolled again when a place is filled (up to four tries a spot), or simply not made when the spawner tops up. One out of sight that would grow past the boss goes away. The bosses other than Jods grow with Lāčplēsis, so their places stay full; the very strongest creatures just don't appear until the boss is beaten.
- A boss pushes Lāčplēsis back exactly like any stronger enemy. Bosses never chase him outside their arena.
- **Boss numbers scale with Lāčplēsis**, like other enemies: they're set from his strength whenever the boss is out of sight, and stay put while it's on screen. The Great Bear is 1.4× his strength, so he needs a weapon, a helper or the sleep flute. The three-headed Jods's heads are 1.28×, 1.92× and 0.88× his strength **when he first comes to Jods's place**. Unlike every other enemy, Jods's heads then keep those numbers for good: they don't grow while Jods is off screen, a beaten head comes round with the same number, and they stay the same on later visits and in the save. So Jods starts strong, and Lāčplēsis can always go and get stronger first. Once Lāčplēsis is far stronger than Jods, his place empties out until Jods is beaten (see below). After that, each beaten head's share helps with the next.
- **Jods fights back.**
  - **Heads come round:** a beaten head comes round after 15 s (18 s for the six-headed, 21 s for the nine-headed), with the same number it had. A ring over the drooping head shows how soon, turning red near the end. All three have to be beaten in one go.
  - **Club slam**, with no words and no mark on the ground: about every 2.7 s while Lāčplēsis is within about 340 px, the head nearest him shouts and the club goes up glowing for 0.9 s. Then a quick swing, and the club comes down where Lāčplēsis stood when the wind-up began, in front of the giant, behind him or to the side, kept between about 50 and 250 px from his feet (more for the bigger giants), with a thud, dust and a white shock ring (about 240 × 120 px, bigger for the bigger giants). The shock also reaches him right at the giant's feet. A hit always pushes him away from the giant (no strength lost), hard enough to end up about 260 px from him (more for the bigger giants) unless a tree or water stops him; the shield stops it; moving away during the wind-up avoids it. While every head is beaten or asleep, the giant doesn't swing.

## Other characters (friendly, blue numbers)

- **Kurbads**, **Koknesis** and **Sprīdītis** are helpers who live in houses (see Helpers' houses).
- **Spīdola**, the witch of the epic. Her **broom** (Spīdolas slota) turns up in chests and lets Lāčplēsis fly. In the finale she helps against the Black Knight by lighting the way.
- **Paija** (from *Maija un Paija*), the kind, hard-working girl. In the Rundāle palace garden she waves, and walking up to her makes her put a weapon down for Lāčplēsis and point to a chest.
- **Maija**, the spoiled sister. She's a playful **non-enemy**: she runs away carrying a chest, and catching her (she's slower than Lāčplēsis) drops the chest. She has no number and can't hurt him.
- **Tautumeitas**, girls in folk costume: one on the meadows of every other place (Lielvārde, Koknese, Cēsis, …), at most one per two places, always in the same spot and well away from the boss. Each region has its own costumes: a long striped skirt, a white blouse, a shawl with a brooch (sakta), a braid, and a flower wreath or a beaded crown. A tautumeita with a gift ready shows it in a bubble above her and as a pink dot on the minimap. Walking up to her makes her sing a little tune ("Še, ņem!", "Lai tev veicas!"), wave, and put the weapon down for Lāčplēsis. Her gift is always a major item. She has a new one ready 40 s later.
- **Laimdota**, Lāčplēsis's beloved. She waits in Rīga and appears in the ending scene.

## Chests: weapons and gear

Chests are wooden, with a domed lid, iron bands, a lock plate and an Auseklis star, and they glow blue. Now and then a chest wiggles as if something is inside. Walking into one opens it: the lid flips up, light shines out, and the item rises from inside. Chests hold **weapons, armour and gear, never helpers**, and always a major item (see Core mechanic). Effects are temporary, and Lāčplēsis visibly carries the item while it lasts. Each one is shown in the HUD as an icon with a shrinking timer ring, and picking up the same item again resets its timer.

| Item | Effect | Duration |
|---|---|---|
| **Zobens** (sword) | strength counts **×1.5** in fights | 25 s |
| **Dzelzs vāle** (iron club) | strength counts **×2** in fights | 15 s |
| **Ķivere** (helmet, with a red plume) | strength ×1.25, on top of any weapon | 25 s |
| **Bruņas** (chain mail) | no strength drain, and burning costs half as much, but swimming in it costs twice as much (heavy iron in the water) | 25 s |
| **Vairogs** (shield, red-white-red) | stronger enemies can't push him back, so he walks straight past them (but doesn't beat them) | 20 s |
| **Septiņjūdžu zābaki** (seven-league boots) | he walks much faster | 25 s |
| **Spīdolas slota** (Spīdola's broom) | he flies on the witch's broom, over forest walls and water | 12 s |
| **Pērkona cirvis** (Pērkons's axe) | every 1.4 s a lightning bolt beats the nearest enemy he could beat anyway | 20 s |
| **Miega stabule** (sleep flute) | nearby enemies fall asleep, turn yellow, and their numbers are halved | 15 s |
| **Lielā zvaigzne** (big star, rare, not in the proof of concept) | **permanent** +10% strength | permanent |

- **The golden boss chest** always gives a permanent strength bonus and a "trophy" item for the Rīga ending (for example a piece of the castle Laimdota waits in).
- Chests respawn slowly, about one a minute, until the location is back to its usual number.
- Chests can also contain the enemy debuffs described in the next section.

## Helpers' houses

Helpers aren't found in chests. They live in Latvian log farmhouses with thatched roofs, and each house has the helper's face on a sign above the door. When the sign glows blue, the helper is home: walking up to the door brings them along for 45 s. They then rest for 30 s (a grey sign with "Zzz") before they can come again. Only one helper comes along at a time, so calling a new one sends the old one home. A helper keeps coming along when Lāčplēsis travels to another location.

| Helper | House | What he does |
|---|---|---|
| **Kurbads**, the folk hero who fought Jods | Zilie kalni (Vidzeme) | carries an iron club and has a blue number of half Lāčplēsis's strength, which is **added** to his in fights |
| **Koknesis**, Lāčplēsis's friend | Kokneses pilsdrupas, on the Daugava | finds weapons for him: every 12 s he hands over a sword, club or axe |
| **Sprīdītis**, the small boy from Anna Brigadere's play, in a straw hat | Tērvetes mežs (Zemgale) | while he's along, **strength doesn't drain**, and a yellow arrow keeps pointing to the nearest chest |

## Buffs and debuffs

### Rules

- **Buffs** help Lāčplēsis. **Debuffs** mostly land on **enemies**, which turn **yellow** and get weaker. Debuffs on Lāčplēsis himself are rare, short, mild and funny.
- Every effect is visible on the character itself (a glow, a frog, snowflakes) **and** as an icon:
  - Buffs on Lāčplēsis are shown as **blue** icons in the HUD, with a timer ring.
  - Debuffs on Lāčplēsis are shown as **purple** icons in the HUD, with a timer ring.
  - Enemy debuffs are shown as a small icon next to the enemy's number.
- When a debuff lowers an enemy's number, the number **counts down visibly** (for example 40 → 20), so the child sees it get weaker.
- Different buffs stack. Picking up the same buff again resets its timer. To keep the HUD readable, at most **3** buffs are active at once, and a new one replaces the one closest to running out.
- **No debuff ever lowers Lāčplēsis's strength, blocks progress, or reverses the controls.** (The slow strength drain is part of the core mechanic, not a debuff.) A hero debuff lasts at most 6 s, can't stack, and is followed by 10 s of immunity.

### Buffs on Lāčplēsis (besides the chest powers)

| Buff | Source | Effect | Duration |
|---|---|---|---|
| **Pīrāgs** (bacon bun) | food found in villages | +3 strength every second | 5 s |
| **Medus** (honey) | beehives in Vidzeme forests. Once the Great Bear is beaten, he leaves honey around as a thank-you | wins give double strength | 15 s |
| **Jāņu siers** (Midsummer cheese) | rare food, mostly in Zemgale | +25% strength | 20 s |
| **Sklandrausis** (carrot pie) | farmhouses | walks faster on any ground, not just roads | 20 s |
| **Jāņu ugunskurs** (Midsummer bonfire) | fixed bonfire spots on the map | while he stands near the fire, strength comes back slowly, like at the spring | while near |
| **Svētozols** (sacred oak) | one big oak per region | resting under it gives a shield like Laimdota's wreath | 15 s after leaving |
| **Sērija** (streak) | beating 3 enemies within 5 s | a small bonus and a "Malacis!" ("Well done!") popup | instant |

### Debuffs on enemies (they turn yellow)

| Debuff | Source | Effect on the enemy | Duration |
|---|---|---|---|
| **Miegs** (sleep) | chest item *Miega stabule* (sleep flute), or Spīdola's lullaby | falls asleep with a "Zzz" bubble, and its number is **halved** | 15 s |
| **Sasalis** (frozen) | chest item *Ziemas sniegpārsla* (winter snowflake) | every enemy on screen freezes in an ice cube, number −30% | 10 s |
| **Apreibis** (dizzy) | Kurbads (as an ally) whistles at enemies near him | the enemy spins on the spot, number −25% | 8 s |
| **Nobijies** (scared) | *Lāča rēciens* (bear roar), chest item: a roar wave from Lāčplēsis | weaker enemies run away and drop whatever weapon they hold. Stronger ones shrink a little, number −20% | 10 s |
| **Apžilbis** (dazzled) | *Saules zīme* (sun sign), chest item | enemies covering their eyes can't push him back (he passes through them) | 8 s |
| **Saslapis** (soaked) | an enemy walking into a river or lake, or splashed by the Kuldīga waterfall | the enemy is slow and dripping, number −10% | 10 s |

- Enemy debuffs from different sources **multiply** (sleeping and frozen together: 50% × 70% = 35% of the number), so combining them is a little "aha" moment.
- **On bosses**, a debuff hits only one head or armour piece: the nearest one, or the one that was touched. Putting the strongest Jods head to sleep is a handy shortcut.

### Debuffs on Lāčplēsis (rare, harmless, funny)

| Debuff | Source | Effect | Cure |
|---|---|---|---|
| **Varde** (frog) | Ragana's spell (boss fight and Sēlija) | he becomes a frog that hops, can still pick up weapons, and is ignored by enemies (no fights either way) | ends after 5 s, or straight away if he picks up a weapon |
| **Purvs** (swamp) | swamp patches in Latgale | he walks slowly while in the swamp | step out of the swamp. Roads and planks cross it |
| **Lipīgais medus** (sticky honey) | stepping in a spilled honey puddle | he's slower and leaves sticky footprints | 4 s |
| **Joda dūmi** (Jods's smoke) | a Jods head sneezing smoke | the screen turns a little smoky around the edges (the middle stays clear), and he's slower | 4 s, or walk out of the cloud |
| **Maijas jociņš** (Maija's prank) | catching Maija sometimes | a funny hat appears on Lāčplēsis's head. It's purely cosmetic and has no effect | 10 s |

- Effects deliberately left out, because they would frustrate or scare a 6-year-old: reversed controls, sudden big losses of strength, getting stuck, darkness covering the whole screen, and debuffs that last a long time.

### Enemy buffs (sparingly)

- **Bruņinieka karogs** (the knight's banner): in Rīga, a flag-bearer guard gives nearby guards +50 (they glow red). Beating the flag-bearer, or knocking the banner over, removes the bonus. This teaches "beat the helper first".
- **Raganas katls** (the witch's cauldron): in Sēlija, enemies near a bubbling cauldron get +20%. Kicking the cauldron over (it has a blue number, so a strong enough Lāčplēsis can tip it) or hitting it with Pērkona zibens removes the bonus.

## Numbers and tuning (starting values)

The goal is short, clear progress: beating a location should take a few minutes. Ordinary enemies and bosses scale with Lāčplēsis (see Core mechanic), so the challenge comes from the drain and from the fixed boss numbers. Numbers stay under 1000 so they fit on the screen and a child can read them out.

| Setting | Value |
|---|---|
| Starting strength | 5 |
| The drain stops at | half of the best strength so far, at least 5 |
| Drain | 0.12% of strength above the floor per second, at least 0.02 per second |
| Share of a beaten enemy's number gained | 3.5%, shrinking towards 0 as strength nears 999 (kept as a fraction) |
| Highest strength or enemy number | 999 |
| Enemy strength compared with Lāčplēsis | 35%: 0.45–0.85×, 35%: 0.9–1.25×, 30%: 1.35–2.4× (Zemgale ×1.15, Kurzeme ×1.25, Latgale ×1.35 on top) |
| Kurbads's number | half of Lāčplēsis's strength |

| Boss | Strength compared with Lāčplēsis |
|---|---|
| Great Bear (Vidzeme) | 1.3× |
| Three-headed Jods (Zemgale) | heads 1.6× / 2.4× / 1.1× (×0.8: 1.28 / 1.92 / 0.88), fixed from the first visit; heads wake up after 15 s; club slam every ~2.7 s, aimed where he stood |
| All Jods heads | the factors below ×0.8 (playtested as too hard, twice) |
| Six-headed Jods (Kolkasrags) | heads 1.3 / 2.6 / 1.1 / 2.0 / 3.0 / 1.6× |
| Nine-headed Jods (Tērvetes pilskalns, final) | heads 1.4 / 2.8 / 1.1 / 2.2 / 3.4 / 1.7 / 2.5 / 1.2 / 3.0× |
| Ragana (Lubāna klāni) | 1.4× |
| Vadonis (most locations) | 1.15× times the region's hardness |
| Swimming | −1.5% strength a second (half with chain mail), down to 1 |
| Burning the forest | −3% strength (half with chain mail); trees grow back after 90 s |

- Stronger enemies are drawn a little bigger, and weaker ones a little smaller.
- The values live at the top of `game.js` (`REGIONS`, `LOCATIONS`, `POWER_*`, `DECAY`, `GAIN`, `SWIM_COST`, `BURN_COST`, `REGROW`, `rollFactor`, `BEAR_FACTOR`, `CHIEF_FACTOR`, `JODS_FACTORS`, `JODS_REGROW`, `SLAM_*`, `GIANT_LOOKS`), for easy tuning after playtesting.
- Enemies wander slowly within a home area. Some sleep (with a "Zzz" bubble) until he comes close. None of them chases him far, and none is faster than he is.

## Look and feel

- A bright, warm folk style: Latvian ornament patterns (Auseklis star, sun signs) on the chests, HUD frame, gates and title screen. The red-white-red flag appears on the title screen and on the victory flagpole.
- Smooth, rounded characters with big readable numbers. No blood. Defeats are always "poof + stars + run away".
- Sounds: short WebAudio blips (pling for picking things up, boing for push-back, a fanfare for a boss and a gate). There's a mute button, and a new-game button (with a confirm) under it. The R key does the same.
- The HUD: the strength number large in the top left with a bear-ear icon, active power-up icons with timer rings next to it, and the minimap and map button in the top right. Nothing else.

## Screens

- **Title:** "Lāčplēsis", a picture of the hero with the Latvian flag and a big ▶ play button. If there is a save, it continues from there.
- **Play.**
- **Map:** the whole of Latvia with the location pins; pick one to travel there (see The map of Latvia).
- **Pause:** opens automatically when the window loses focus.
- **Ending:** in Rīga, Lāčplēsis and Laimdota stand by the Daugava, with fireworks and the collected trophies shown. After that the child can keep exploring freely ("Spēlēt tālāk").

## Out of scope (for now)

- Spoken audio or voice-over.
- Multiple save slots.
- Customising the hero.
