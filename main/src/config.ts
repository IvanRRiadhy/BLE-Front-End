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
}

let runtimeConfig: RuntimeConfig | null = null;

export async function loadRuntimeConfig(): Promise<void> {
  const res = await fetch("/config.json");
  runtimeConfig = await res.json() as RuntimeConfig;
}

export function getConfig(): RuntimeConfig {
  if (!runtimeConfig) {
    throw new Error("Runtime config has not been loaded yet.");
  }
  return runtimeConfig;
}
