// Runs the speed benchmark (tools/bench.html) in headless Chromium and prints its results.
// Usage: node tools/bench.js [--attr] [--n=30] [--scale=2]
//   --attr   also shows how long each drawing function takes (those frames run slower)
//   --n      frames timed at each spot
//   --scale  the screen's pixel ratio (the game caps it at 1.5)
// The window is 1280 × 800. Plain headless runs (--screenshot, --dump-dom) put the page on
// virtual time, where performance.now() doesn't move, or hang; so this drives Chromium over its
// debugging protocol instead and waits for the page to write its results.
// Chromium here is a snap: its profile lives under ~/snap/chromium/common/, where it can write.
'use strict';
const { spawn } = require('child_process');
const path = require('path');

const args = process.argv.slice(2);
const opt = (name, def) => { const a = args.find(s => s.startsWith('--' + name + '=')); return a ? a.split('=')[1] : def; };
const attr = args.includes('--attr'), n = opt('n', '30'), scale = opt('scale', '2');
const page = 'file://' + path.join(__dirname, 'bench.html') + `?n=${n}` + (attr ? '&attr=1' : '');
const port = 9300 + Math.floor(Math.random() * 500);
const profile = path.join(process.env.HOME, 'snap/chromium/common/bench-profile');

const chrome = spawn('chromium', ['--headless', '--mute-audio', '--disable-gpu', `--force-device-scale-factor=${scale}`,
  '--window-size=1280,800', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
// always leave no browser behind
const finish = code => { try { chrome.kill('SIGKILL'); } catch (e) { /* already gone */ } process.exit(code); };
process.on('SIGINT', () => finish(130));
setTimeout(() => { console.log('timed out'); finish(1); }, 300000);

const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  let targets = null;
  for (let k = 0; k < 60 && !targets; k++) {
    try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); } catch (e) { await sleep(300); }
  }
  if (!targets) { console.log('Chromium did not start'); finish(1); }
  const ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
  let id = 0;
  const waiting = {};
  const send = (method, params = {}) => new Promise(r => { waiting[++id] = r; ws.send(JSON.stringify({ id, method, params })); });
  ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && waiting[d.id]) { waiting[d.id](d.result); delete waiting[d.id]; } };
  await new Promise(r => { ws.onopen = r; });
  await send('Page.navigate', { url: page });
  for (;;) {
    await sleep(1000);
    const r = await send('Runtime.evaluate', { expression: "document.getElementById('out')?.textContent" });
    if (r && r.result && r.result.value) { console.log(r.result.value); finish(0); }
  }
})();
