import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { StatusBar, Style } from "@capacitor/status-bar";

export const isNative = (): boolean => Capacitor.isNativePlatform();

/** Android/iOS kabuğunda durum çubuğunu oyuna uydurur. Tarayıcıda hiçbir şey yapmaz. */
export async function initNative(): Promise<void> {
  if (!isNative()) return;
  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: "#080b14" });
    await StatusBar.hide();
  } catch {
    // eklenti yoksa sessizce geç
  }
}

/** Donanım/geri hareketi dinleyicisi. Dönen fonksiyon dinleyiciyi kaldırır. */
export function onNativeBack(handler: () => void): () => void {
  if (!isNative()) return () => {};
  const sub = CapApp.addListener("backButton", handler);
  return () => {
    void sub.then((h) => h.remove());
  };
}

export function exitNativeApp(): void {
  if (isNative()) void CapApp.exitApp();
}
