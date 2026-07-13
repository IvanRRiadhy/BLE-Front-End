export interface RuntimeConfig {
  API_BASE_URL: string;
  API_ENGINE_URL: string;
  MQTT_URL: string;
  NTFY_URL: string;
  CDN_URL: string;
  ALARM_TOPIC: string;
  MQTT_USERNAME: string;
  MQTT_PASSWORD: string;
  API_KEY: string;
  NTFY_TOPIC: string;
  LOGO_URL: string;
  GEDUNG_IMG_URL: string;
}

let runtimeConfig: RuntimeConfig | null = null;

export async function loadRuntimeConfig(): Promise<void> {
  const res = await fetch("/config.json");
  runtimeConfig = await res.json() as RuntimeConfig;

  if (runtimeConfig && runtimeConfig.LOGO_URL) {
    const link = (document.getElementById("favicon") || document.querySelector("link[rel*='icon']")) as HTMLLinkElement;
    if (link) {
      link.href = runtimeConfig.LOGO_URL;
    }
  }
}

export function getConfig(): RuntimeConfig {
  if (!runtimeConfig) {
    throw new Error("Runtime config has not been loaded yet.");
  }
  return runtimeConfig;
}
