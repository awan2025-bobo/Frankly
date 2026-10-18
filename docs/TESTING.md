# Testing Frankly on a phone

Frankly runs in **Expo Go** on iPhone or Android, straight from the dev server.

## Every time

1. **Laptop:** open a terminal in the `Frankly` folder and pull the latest:
   ```bash
   git pull
   ```
   ```bash
   npm install
   ```
   (Only needed when someone added packages, but it's harmless to run every time.)
2. **Start the server:**
   ```bash
   npx.cmd expo start --lan
   ```
   On Windows PowerShell, always type `npx.cmd`, not `npx` (PowerShell blocks `npx.ps1`).
3. **Phone:** same Wi-Fi as the laptop. Open the iPhone **Camera** and scan the QR code. It opens in Expo Go.
4. **Leave the terminal running while you test.** Closing it disconnects the phone.

## While you're editing

- **Saving a file reloads the app on the phone automatically**, so you don't need to scan again.
- If the phone looks stuck or out of date: **shake the phone**, then tap **Reload**, or press `r` in the terminal.
- If things get weird after pulling big changes, stop the server (Ctrl+C) and restart with a clean cache:
  ```bash
  npx.cmd expo start --lan --clear
  ```

## Demo mode vs. real backend

- **No `.env` file** means **demo mode**: sample recipes and sample prices, data saved on the phone. A "Demo mode · sample prices" badge shows on Home.
- **With `.env`** (Supabase URL + anon key, see `docs/BACKEND_SETUP.md`), it uses the real Claude + Kroger backend. Restart the server after creating or changing `.env`.
- To start fresh: **Profile → Reset demo (start over)**.

## If it won't connect

| Phone says | Fix |
| --- | --- |
| "Incompatible with this version of Expo Go" | Project SDK is newer than App Store Expo Go. We're on **SDK 57** on purpose; don't upgrade. |
| "Signed into Expo Go as X, but not signed into Expo CLI" | Sign **out** of Expo Go on the phone, **or** give the laptop a *personal* token for the same account (expo.dev → switch to the personal account, not the org → Account settings → Access tokens), then run `$env:EXPO_TOKEN = '...'` in that terminal before starting. Robot/org tokens don't work. |
| Stuck on "Opening project…" | Check the terminal is still running. Then check the phone is on the same Wi-Fi. If the Wi-Fi blocks it, put the laptop on the phone's **Personal Hotspot** and restart. |
| Red error screen | Read the error in the terminal; it usually names the file and line. |

Tunnel mode (`npx.cmd expo start --tunnel`) also exists for networks that block phone-to-laptop traffic. It needs a logged-in personal Expo account (not a robot token).
