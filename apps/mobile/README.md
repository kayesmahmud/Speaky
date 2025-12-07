# Speaky Mobile (Expo)

## Quickstart
1) Install deps (Expo SDK versions will align when you use `expo install`):
```
cd apps/mobile
npm install
```
2) Run the app:
```
npx expo start --tunnel
```
Use `i` for iOS simulator or `a` for Android emulator/Expo Go.

## Notes
- `App.tsx` is a simple placeholder; add navigation (expo-router or React Navigation) as you build screens.
- Store tokens in `expo-secure-store`, and fetch data with React Query.
- Configure push notifications via `expo-notifications` or OneSignal when you wire the backend.
