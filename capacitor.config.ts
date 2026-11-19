import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.gibigibi.mmorpg",
  appName: "Legendary Gems",
  webDir: "dist",
  backgroundColor: "#080b14",
  android: {
    allowMixedContent: false,
  },
};

export default config;
