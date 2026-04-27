// Web stub — expo-sqlite is native-only.
// Metro picks this file on web platform, so expo-sqlite is never imported.
export async function getDb(): Promise<never> {
  throw new Error('SQLite is not available on web. Use Expo Go or a native build.');
}
