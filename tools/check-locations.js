// Headless check of every location: builds each one, checks that its key spots can be walked to
// from the start, plays a little, beats every boss with full strength, opens every golden chest,
// and checks the burn question and the final place's unlock rule.
// Usage: node tools/check-locations.js
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');

const src = fs.readFileSync(path.join(__dirname, '..', 'game.js'), 'utf8');
function fakeCtx() {
  const base = {
    measureText: () => ({ width: 50 }),
    createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
  };
  return new Proxy(base, { get: (t, k) => (k in t ? t[k] : () => {}), set: () => true });
}
const fakeCanvas = () => ({ getContext: fakeCtx, style: {}, addEventListener() {}, width: 0, height: 0 });
const store = {};
const sandbox = {
  document: { getElementById: fakeCanvas, createElement: fakeCanvas },
  window: { innerWidth: 1100, innerHeight: 750, devicePixelRatio: 1, addEventListener() {}, removeEventListener() {} },
  localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = v; }, removeItem: k => { delete store[k]; } },
  requestAnimationFrame: () => {}, performance: { now: () => Date.now() }, setTimeout: () => {}, console, Math, JSON, Date,
  report: { bad: 0 },
};
vm.createContext(sandbox);

const checks = `
const fail = msg => { console.log('FAIL ' + msg); report.bad++; };
const onIsland = p => L.islands.some(is => Math.hypot((p.x - is.x) / is.rx, (p.y - is.y) / is.ry) < 1);
const near = (p, reach) => { const i = cellOf(p.x, p.y);
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (reach[i + dy * GW + dx]) return true; return false; };
startGame(false);
const per = LOCATIONS.reduce((n, l) => n + l.maidens, 0);
if (per * 2 > LOCATIONS.length) fail('more than one tautumeita per two places');
for (const def of LOCATIONS) {
  game.progress.opened = new Set(LOCATIONS.map(l => l.id));
  enterLocation(def.id);
  const spots = [['boss', L.boss], ['spring', L.spring], ['paija', L.paija], ['sign', L.sign],
    ...L.houses.map(h => ['house ' + h.id, { x: h.x, y: h.y + 30 }]),
    ...game.maidens.map((m, k) => ['tautumeita ' + k, m]),
    ...(L.landmark && !onIsland(L.landmark) ? [['landmark front', { x: L.landmark.x, y: L.landmark.y + 40 }]] : []),
    ...L.bridges.flatMap((b, k) => [-1, 1].map(s => ['bridge ' + k, { x: b.x + b.px * s * (b.half + 25), y: b.y + b.py * s * (b.half + 25) }]))];
  for (const [n, p] of spots) if (p && !near(p, L.reach)) fail(def.id + ': ' + n + ' cannot be reached');
  // islands, their gifts and anything standing on them can be reached by swimming from the start
  const swimReach = new Uint8Array(GW * GH), q = [cellOf(L.start.x, L.start.y)];
  swimReach[q[0]] = 1;
  for (let h = 0; h < q.length; h++) for (const o of [1, -1, GW, -GW]) {
    const n = q[h] + o;
    if (n >= 0 && n < GW * GH && !swimReach[n] && blocked[n] <= 1) { swimReach[n] = 1; q.push(n); }
  }
  for (const is of L.islands) if (!near(is, swimReach)) fail(def.id + ': island cannot be swum to');
  for (const sp of L.islandGifts) if (!near(sp, swimReach)) fail(def.id + ': island gift cannot be reached');
  if (L.landmark && onIsland(L.landmark) && !near({ x: L.landmark.x, y: L.landmark.y + 40 }, swimReach)) fail(def.id + ': island landmark cannot be reached');
  for (const [k, sp] of L.islandGifts.entries()) if (!game.items.some(it => it.slot === k)) {
    update(0.1);
    if (!game.items.some(it => it.slot === k)) fail(def.id + ': island gift ' + sp.id + ' missing');
  }
  if (game.maidens.length !== def.maidens) fail(def.id + ': ' + game.maidens.length + ' tautumeitas instead of ' + def.maidens);
  // maldugunis float only over the swamps, and every place with swamps has some
  {
    const wisps = game.enemies.filter(e => e.type === 'wisp');
    if (L.swampCells.length && !wisps.length) fail(def.id + ': swamps but no maldugunis');
    if (!L.swampCells.length && wisps.length) fail(def.id + ': maldugunis without swamps');
    for (const w of wisps) if (!inSwamp(w.home.x, w.home.y)) fail(def.id + ': a malduguns starts outside the swamp');
    for (let f = 0; f < 120; f++) { updateEnemies(1 / 10); for (const w of wisps) if (w.target && !inSwamp(w.target.x, w.target.y)) { fail(def.id + ': a malduguns heads out of the swamp'); f = 999; break; } }
    if (def.region === 1 && def.boss && def.boss.type === 'chief' && def.boss.enemy !== 'vadatajs') fail(def.id + ': Zemgale vadonis is not a vadātājs');
  }
  // laid-out swamps really separate the boss: not on dry land, but by wading through the swamp or by swimming
  if (L.swampAreas.length) {
    const from = cellOf(L.start.x, L.start.y), to = cellOf(L.boss.x, L.boss.y);
    const can = ok => { const seen = new Uint8Array(GW * GH), q = [from]; seen[from] = 1;
      for (let k = 0; k < q.length; k++) for (const o of [1, -1, GW, -GW]) { const n = q[k] + o;
        if (n >= 0 && n < GW * GH && !seen[n] && ok(n)) { seen[n] = 1; q.push(n); } }
      return seen[to] === 1; };
    if (can(n => blocked[n] === 0 && !swamp[n])) fail(def.id + ': the boss can be reached without the swamp or swimming');
    if (!can(n => blocked[n] === 0)) fail(def.id + ': the boss cannot be reached through the swamp');
    if (!can(n => (blocked[n] === 0 && !swamp[n]) || blocked[n] === 1)) fail(def.id + ': the boss cannot be reached by swimming');
  }
  // swamps are never close to the sea
  for (let i = 0; i < GW * GH; i++) {
    if (!swamp[i]) continue;
    const cx = i % GW, cy = Math.floor(i / GW);
    for (let dy = -8; dy <= 8; dy++) for (let dx = -8; dx <= 8; dx++) {
      const x = cx + dx, y = cy + dy;
      if (x >= 0 && y >= 0 && x < GW && y < GH && terrain[y * GW + x] === T_SEA) { fail(def.id + ': swamp next to the sea'); i = GW * GH; dy = dx = 99; }
    }
  }
  if (L.boss) for (const o of [...game.items, ...game.chests.filter(c => !c.gold), ...game.maidens])
    if (dist(o.x, o.y, L.boss.x, L.boss.y) < BOSS_GIFT_GAP) fail(def.id + ': a gift too near the boss');
  state = 'play';
  for (let f = 0; f < 200; f++) {
    keys.clear(); keys.add(['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'][Math.floor(f / 50)]);
    update(1 / 30);
    if (state !== 'play') state = 'play';
    if (f % 50 === 0) { drawWorld(); drawHUD(); }
  }
  keys.clear();
}
openMap(); drawMapScreen(); mapStep(1); drawMapScreen(); travel(game.mapSel);
// restarting from the map: "no" goes back to the map, "yes" starts a new game
{
  openMap(); const nr = mapRestartRect(); mapTap(nr.x, nr.y);
  if (state !== 'ask' || game.ask.from !== 'map') fail('the map restart button does not ask');
  answerAsk(false);
  if (state !== 'map') fail('saying no to restarting from the map does not go back to the map');
  const had = game.progress.opened.size;
  mapTap(nr.x, nr.y); answerAsk(true);
  if (state !== 'play' || game.progress.opened.size !== 0 || game.loc.id !== LOCATIONS[0].id) fail('restarting from the map does not start a new game (had ' + had + ' places done)');
  game.progress.opened = new Set(LOCATIONS.map(l => l.id));
}
offerBurn({ x: 100, y: 100 }); drawWorld(); drawHUD(); answerBurn(false);
drawTitle();

// every Jods is a giant whose club slam pushes him back where he stood (in front, behind, to the side),
// not with a shield, not from far away, not if he steps away in time, and not while every head is
// asleep; the two-handed one uses both arms; the giant is drawn in every pose; and beating him clears
// the "hurry" words at once
for (const id of LOCATIONS.filter(l => l.boss && l.boss.type === 'jods').map(l => l.id)) {
  game.progress.beaten.delete(id);
  enterLocation(id);
  const h = game.hero, b = game.enemies.find(e => e.type === 'jods');
  if (!b || !b.look) { fail(id + ': Jods is not a giant'); continue; }
  const arms = new Set();
  // he stands at (ox, oy) from the giant; moveAway steps him off once the swing has started
  const trySlam = (ox, oy, setup = () => {}, moveAway = false) => {
    b.slam = null; b.slamT = 0; h.kx = h.ky = 0; h.inv = 0; game.fx.shield = 0;
    b.heads.forEach(hd => { hd.beaten = false; hd.sleepT = 0; });
    setup();
    let pushed = false;
    for (let f = 0; f < 70; f++) {
      h.x = b.x + ox; h.y = b.y + oy;
      if (moveAway && b.slam) { h.x += 300; h.y += 200; }
      updateSlam(b, 1 / 30);
      if (b.slam) arms.add(b.slam.arm);
      if (!pushed && Math.abs(h.kx) + Math.abs(h.ky) > 100) {
        pushed = true;
        // always away from the giant, and hard enough to carry him well clear (the push fades as exp(-7 t))
        const ax = h.x - b.x, ay = h.y - b.y;
        if (Math.hypot(ax, ay) > 1 && ax * h.kx + ay * h.ky <= 0) fail(id + ': the slam pushes him towards the giant from ' + Math.round(ox) + ',' + Math.round(oy));
        if (Math.hypot(ax, ay) + Math.hypot(h.kx, h.ky) / 7 < 240 * S) fail(id + ': the slam does not push him well clear from ' + Math.round(ox) + ',' + Math.round(oy));
      }
      if (f % 7 === 0) drawWorld();
    }
    return pushed;
  };
  const S = b.gs;
  for (const [ox, oy, where] of [[170, 0, 'in front'], [-170, 0, 'behind'], [0, -150, 'above'], [0, 140, 'below'], [120, 120, 'aslant'], [170, 0, 'in front again'], [25, 0, 'right at his feet'], [-10, 15, 'right at his feet behind'], [0, 0, 'on his feet']])
    if (!trySlam(ox * S, oy * S)) fail(id + ': the slam does not push him back when he stands ' + where);
  if (trySlam(170 * S, 0, () => { game.fx.shield = 50; })) fail(id + ': the slam pushes him through the shield');
  if (trySlam(600 * S, 0)) fail(id + ': the slam reaches him from far away');
  if (trySlam(170 * S, 0, () => {}, true)) fail(id + ': stepping away after the swing starts does not avoid it');
  if (trySlam(170 * S, 0, () => b.heads.forEach(hd => { hd.sleepT = 99; }))) fail(id + ': the giant swings with every head asleep');
  if (!!b.look.two !== (arms.size === 2)) fail(id + ': the giant swings ' + arms.size + ' arms');
  b.heads[0].beaten = true; b.sitT = 1; b.fleeing = 2; drawWorld();
  b.sitT = 0; b.moving = true; drawWorld(); b.fleeing = undefined; b.moving = false;
  // pushing into his body beats a head he can beat, even when a stronger head is nearer
  {
    b.heads.forEach(hd => { hd.beaten = false; hd.sleepT = 0; hd.value = 999; });
    const weak = b.heads.length - 1;
    b.heads[weak].value = 1;
    h.power = 50; game.fx.club = 0; game.fx.sword = 0; game.fx.helmet = 0; game.ally = null;
    h.x = b.x - 60 * S; h.y = b.y - 20; h.inv = 0;   // at the edge of his body, under the first heads
    const before = b.heads[weak].beaten;
    updateEnemies(0);
    if (before || !b.heads[weak].beaten) fail(id + ': pushing into the giant does not beat the weak head');
    if (b.heads.slice(0, weak).some(hd => hd.beaten)) fail(id + ': pushing into the giant beats a head that is too strong');
  }
  // beating every head clears the "hurry" words at once
  b.heads.forEach(hd => { hd.beaten = false; hd.sleepT = 0; });
  h.power = 999; game.fx.club = 100;
  for (let k = 0; k < b.heads.length; k++) fight(b.heads[k], b, b.x, b.y);
  if (!game.progress.beaten.has(id)) fail(id + ': beating every head does not beat Jods');
  if (game.popups.some(p => JODS_WORDS.includes(p.text))) fail(id + ': the "hurry" words stay after Jods is beaten');
  game.progress.beaten.delete(id);
}

for (const def of LOCATIONS) {
  enterLocation(def.id);
  const h = game.hero; h.power = 999; h.maxPower = 999; game.fx.club = 100; game.fx.helmet = 100;
  const b = game.enemies.find(e => e.kind === 'boss');
  if (!b) { fail(def.id + ': no boss'); continue; }
  for (let f = 0; f < 600 && !game.progress.beaten.has(def.id); f++) {
    if (b.heads) { const k = b.heads.findIndex(hd => !hd.beaten); if (k >= 0) { h.x = b.x + b.headPos[k].x; h.y = b.y + b.headPos[k].y + 20; } }
    else { h.x = b.x; h.y = b.y; }
    h.inv = 0; update(1 / 30); state = 'play';
  }
  const c = game.chests.find(c => c.gold);
  if (!c) { fail(def.id + ': boss not beaten'); continue; }
  h.x = c.x; h.y = c.y;
  for (let f = 0; f < 200; f++) { update(1 / 30); if (state !== 'play') state = 'play'; }
  drawWorld(); drawHUD();
}
if (game.progress.opened.size !== LOCATIONS.length) fail('only ' + game.progress.opened.size + ' golden chests opened');

// burning: pushing straight into maze trees asks; the edge belt never does
enterLocation('tervete'); state = 'play'; game.enemies = [];
const h = game.hero;
const pushInto = t => { for (let i = 0; i < GW * GH; i++) {
  if (blocked[i] !== 0 || !L.reach[i] || terrain[i + 1] !== t || terrain[i + 2] !== t) continue;
  h.x = (i % GW + 0.5) * CELL; h.y = (Math.floor(i / GW) + 0.5) * CELL; h.route = null; game.askCd = 0;
  state = 'play'; keys.clear(); keys.add('ArrowRight'); game.burnAsk = null;
  for (let f = 0; f < 90 && !game.burnAsk; f++) update(1 / 60);
  keys.clear(); if (state !== 'play') fail('burning stopped the game');
  const asked = !!game.burnAsk; if (asked) answerBurn(false); return asked; } };
if (!pushInto(T_FOREST)) fail('pushing into forest does not ask to burn');
if (pushInto(T_EDGE)) fail('the edge forest asks to burn');
// saying yes burns while the game keeps going; walking away drops the question
{ const i0 = (() => { for (let i = 0; i < GW * GH; i++) if (blocked[i] === 0 && L.reach[i] && terrain[i + 1] === T_FOREST && terrain[i + 2] === T_FOREST) return i; })();
  h.x = (i0 % GW + 0.5) * CELL; h.y = (Math.floor(i0 / GW) + 0.5) * CELL; game.askCd = 0;
  offerBurn({ x: h.x + 50, y: h.y }); const n = game.burnt.length; answerBurn(true);
  if (game.burnt.length === n) fail('yes did not burn');
  offerBurn({ x: h.x + 50, y: h.y }); h.x += 400; update(1 / 60);
  if (game.burnAsk) fail('the burn question stays after walking away'); }

// fighting strength isn't rounded down: a 5 with a sword (7.5) beats a 7, and a tie still pushes
{
  newGame(false); const h = game.hero; h.power = 5.4; game.ally = null;
  for (const k in game.fx) game.fx[k] = 0;
  game.fx.sword = 10;
  if (!canBeat({ value: 7, sleepT: 0 })) fail('a 5 with a sword (7.5) cannot beat a 7');
  if (canBeat({ value: 8, sleepT: 0 })) fail('a 5 with a sword (7.5) beats an 8');
  game.fx.sword = 0; game.fx.club = 10;
  if (canBeat({ value: 10, sleepT: 0 })) fail('a 5 with the club (10) beats a 10: a tie should push');
  game.fx.club = 0; game.fx.helmet = 10;
  if (!canBeat({ value: 6, sleepT: 0 })) fail('a 5 with the helmet (6.25) cannot beat a 6');
}
// chain mail makes swimming cost more strength, not less
{
  const h = game.hero;
  const swim = armor => { enterLocation('vecpiebalga'); const i = L.lakes[0]; h.x = i.x; h.y = i.y; h.power = 100; h.maxPower = 100;
    for (const k in game.fx) game.fx[k] = 0; game.fx.armor = armor ? 50 : 0; game.ally = null;
    for (let k = 0; k < 30; k++) updateHero(0.1); return 100 - h.power; };
  if (!(swim(true) > swim(false) * 1.5)) fail('chain mail does not make swimming cost more');
}
// Jods's heads keep the numbers they first got: not off screen, not when a head comes round,
// not on another visit, and not through the save
{
  newGame(false); const h = game.hero; h.power = 20; h.maxPower = 20;
  game.progress.opened = new Set(LOCATIONS.map(l => l.id));
  enterLocation('tervete');
  const b = () => game.enemies.find(e => e.type === 'jods');
  const first = b().heads.map(hd => hd.value).join(',');
  h.power = 200; h.maxPower = 200; h.x = L.start.x; h.y = L.start.y; cam.x = 0; cam.y = 0;
  for (let f = 0; f < 30; f++) { game.rescaleT = 0; updateRescale(0.1); }
  if (b().heads.map(hd => hd.value).join(',') !== first) fail('Jods heads grow while off screen');
  const hd = b().heads[1]; hd.beaten = true; hd.regrowT = 0.01; updateJods(b(), 0.1);
  if (hd.beaten || b().heads.map(x => x.value).join(',') !== first) fail('a Jods head comes round with a different number');
  enterLocation('lielvarde'); enterLocation('tervete');
  if (b().heads.map(x => x.value).join(',') !== first) fail('Jods heads change on another visit');
  writeSave(); save = loadSave(); newGame(true); enterLocation('tervete');
  if (b().heads.map(x => x.value).join(',') !== first) fail('Jods heads change through the save');
  clearSave(); save = null; newGame(false);
  game.progress.opened = new Set(LOCATIONS.map(l => l.id));
}
// around an unbeaten boss nothing is stronger than it (Jods: his strongest head): not at the start,
// not after Lāčplēsis grows a lot (off-screen creatures that would outgrow it go away), not from new spawns
for (const id of LOCATIONS.filter(l => l.boss).map(l => l.id)) {
  newGame(false); game.progress.opened = new Set(LOCATIONS.map(l => l.id));
  const h = game.hero; h.power = 30; h.maxPower = 30;
  enterLocation(id);
  const over = () => game.enemies.filter(e => e.kind === 'enemy' && e.value > enemyCap()).length;
  if (!(enemyCap() < Infinity)) fail(id + ': no cap from the boss');
  if (over()) fail(id + ': a creature stronger than the boss at the start');
  h.power = 300; h.maxPower = 300; h.x = L.start.x; h.y = L.start.y;
  // look at the corner farthest from the boss, so it's out of sight too
  cam.x = L.boss.x < WORLD_W / 2 ? WORLD_W - VW / Z : 0; cam.y = L.boss.y < WORLD_H / 2 ? WORLD_H - VH / Z : 0;
  // the boss is out of sight too, so (unless it's Jods) it grows with him and the cap with it
  for (let f = 0; f < 600; f++) { game.rescaleT = 0; updateRescale(0.1); updateSpawning(0.1); }
  if (over()) fail(id + ': a creature stronger than the boss after he grew');
  const b = game.enemies.find(e => e.kind === 'boss');
  if (!b.heads && game.enemies.filter(e => e.kind === 'enemy').length < 4) fail(id + ': hardly any creatures left around a boss that grows with him');
  if (!game.enemies.some(e => e.kind === 'enemy')) fail(id + ': no creatures left at all');
}
newGame(false); game.progress.opened = new Set(LOCATIONS.map(l => l.id));
// #visas opens every place in a fresh game, without beating anything
UNLOCK_ALL = true; newGame(false);
if (!LOCATIONS.every(l => isUnlocked(l.id)) || game.progress.opened.size) fail('#visas does not open every place in a fresh game');
UNLOCK_ALL = false; newGame(false);
// the final place opens only after every region's main boss
startGame(false);
for (const l of LOCATIONS) if (!l.final) game.progress.opened.add(l.id);
game.progress.opened.delete(REGION_BOSS_LOCS[0].id);
if (isUnlocked(FINAL_LOC)) fail('final place open with a region boss left');
game.progress.opened.add(REGION_BOSS_LOCS[0].id);
if (!isUnlocked(FINAL_LOC)) fail('final place closed after all region bosses');
console.log(LOCATIONS.length + ' locations checked, ' + report.bad + ' problem(s)');
`;
vm.runInContext(src + '\n' + checks, sandbox, { filename: 'game.js' });
process.exit(sandbox.report.bad ? 1 : 0);
