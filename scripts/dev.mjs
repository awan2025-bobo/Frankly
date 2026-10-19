// Dev launcher. Starts Expo, then prints the web link first and a link to a QR page for Expo Go,
// instead of the big QR code in the terminal. Run: npm.cmd run dev
// Extra flags go to `expo start`, e.g. npm.cmd run dev -- --clear  (after pulling new packages)
// --tunnel keeps Expo's own terminal QR code, since the tunnel URL comes from Expo.
import { spawn } from "node:child_process";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import { createRequire } from "node:module";

const args = process.argv.slice(2);
const tunnel = args.includes("--tunnel");
if (!args.some((a) => ["--lan", "--localhost", "--tunnel", "--host", "-m"].includes(a))) args.unshift("--lan");

const free = (port) =>
  new Promise((resolve) => {
    const s = net.createServer().once("error", () => resolve(false));
    s.listen(port, () => s.close(() => resolve(true)));
  });

async function freePort(start) {
  for (let p = start; p < start + 20; p++) if (await free(p)) return p;
  throw new Error(`No free port from ${start} to ${start + 19}`);
}

// Pick the Wi-Fi address (what the phone can reach); skip VPN/virtual adapters. Override: FRANKLY_HOST=1.2.3.4
function lanIp() {
  if (process.env.FRANKLY_HOST) return process.env.FRANKLY_HOST;
  const virtual = /vethernet|virtualbox|vmware|wsl|hyper-v|docker|loopback|tailscale|zerotier/i;
  const found = [];
  for (const [name, addrs] of Object.entries(os.networkInterfaces())) {
    for (const a of addrs ?? []) {
      if (a.family !== "IPv4" || a.internal || a.address.startsWith("169.254.") || virtual.test(name)) continue;
      found.push({ name, address: a.address });
    }
  }
  const wifi = found.find((f) => /wi-?fi|wireless|wlan/i.test(f.name));
  return (wifi ?? found[0])?.address ?? "127.0.0.1";
}

const portFlag = args.findIndex((a) => a === "--port" || a === "-p");
const port = portFlag >= 0 ? Number(args[portFlag + 1]) : await freePort(8081);
if (portFlag < 0) args.push("--port", String(port));
const host = lanIp();

const webUrl = `http://localhost:${port}`;
const phoneWebUrl = `http://${host}:${port}`;
const expoGoUrl = `exp://${host}:${port}`;

const env = { ...process.env };
if (!tunnel) {
  env.EXPO_NO_QR_CODE = "1";
  env.REACT_NATIVE_PACKAGER_HOSTNAME = host; // so Expo serves the same address the QR page shows
}

const expoCli = createRequire(import.meta.url).resolve("expo/bin/cli");
const child = spawn(process.execPath, [expoCli, "start", ...args], { stdio: "inherit", env });
child.on("exit", (code) => process.exit(code ?? 0));
process.on("SIGINT", () => {}); // Ctrl+C reaches Expo too; we exit when it does

const page = () => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Frankly on your phone</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js"></script>
<style>
  :root { --bg: #f3ecdf; --card: #fffaf1; --ink: #2c2f24; --muted: #6b6a5c; --olive: #4b5538; }
  @media (prefers-color-scheme: dark) { :root { --bg: #1d1f18; --card: #2a2d23; --ink: #f1ead9; --muted: #b5b09d; --olive: #a9b78a; } }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: var(--bg); color: var(--ink);
         font: 16px/1.5 system-ui, sans-serif; padding: 16px; box-sizing: border-box; }
  main { background: var(--card); border-radius: 20px; padding: 28px; max-width: 380px; width: 100%; text-align: center;
         box-shadow: 0 6px 24px rgb(0 0 0 / .08); }
  h1 { margin: 0 0 4px; color: var(--olive); font-size: 26px; }
  p { margin: 8px 0; color: var(--muted); }
  #qr { background: #fff; border-radius: 12px; padding: 12px; display: inline-block; margin: 16px 0 8px; }
  #qr svg, #qr img { display: block; width: 240px; height: 240px; }
  code { word-break: break-all; color: var(--ink); }
  a { color: var(--olive); }
</style></head>
<body><main>
  <h1>Frankly</h1>
  <p>Scan with your phone's Camera to open it in <b>Expo Go</b>.</p>
  <div id="qr">QR code needs internet to draw.<br>Type the link below into Expo Go instead.</div>
  <p><code>${expoGoUrl}</code></p>
  <p>Phone and laptop must be on the same Wi-Fi.</p>
  <p>Web version: <a href="${webUrl}">${webUrl}</a></p>
</main>
<script>
  if (window.qrcode) { const q = qrcode(0, "M"); q.addData(${JSON.stringify(expoGoUrl)}); q.make();
    document.getElementById("qr").innerHTML = q.createSvgTag({ cellSize: 6, margin: 2, scalable: true }); }
</script>
</body></html>`;

const qrPort = await freePort(8090);
http.createServer((_req, res) => res.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(page())).listen(qrPort);

// Wait for Metro, then print the links under Expo's own startup lines.
for (let i = 0; i < 180; i++) {
  const ok = await fetch(`http://localhost:${port}/status`).then((r) => r.text()).then((t) => t.includes("running"), () => false);
  if (ok) break;
  await new Promise((r) => setTimeout(r, 1000));
}
await new Promise((r) => setTimeout(r, 1000));

const b = (s) => `\x1b[1m${s}\x1b[0m`;
const u = (s) => `\x1b[4m\x1b[36m${s}\x1b[0m`;
console.log(`
  ${b("Frankly is running")}
  ${b("Web:")}         ${u(webUrl)}   (opens in your browser, same app as on the phone)
  ${b("Phone QR:")}    ${tunnel ? "use the QR code Expo printed above (tunnel mode)" : u(`http://localhost:${qrPort}`) + "   (open, then scan with your phone's Camera)"}
  ${tunnel ? "" : `${b("Expo Go link:")} ${expoGoUrl}`}
  Ctrl+click a link to open it. Press r to reload, Ctrl+C to stop.
`);
