import { uniqueId } from 'lodash';
import mqtt from 'mqtt';
import { getConfig } from 'src/config';

// ❌ remove this:
// const MQTT_URL = getConfig().MQTT_URL;

// ✔ replace with mutable variable:
export let MQTT_URL = '';
export let MQTT_USERNAME = '';
export let MQTT_PASSWORD = '';

// ✔ initialize later in main.tsx
export function initializeMQTTConfig() {
  MQTT_URL = getConfig().MQTT_URL;
  MQTT_USERNAME = getConfig().MQTT_USERNAME;
  MQTT_PASSWORD = getConfig().MQTT_PASSWORD;
}

function matchTopic(subscribed: string, actual: string): boolean {
  const subLevels = subscribed.split('/');
  const actLevels = actual.split('/');

  for (let i = 0; i < subLevels.length; i++) {
    const sub = subLevels[i];
    const act = actLevels[i];

    if (sub === '#') return true;
    if (sub === '+') continue;

    if (sub !== act) return false;
  }

  return subLevels.length === actLevels.length;
}

const generateClientId = () => {
  return (
    'Klien_FrontEnd_' +
    Math.random().toString(16).substr(2, 8) +
    '_' +
    Date.now() +
    '_' +
    uniqueId()
  );
};

// IMPORTANT: Broker_URL must be read dynamically
let Broker_URL = '';
export function updateMQTTBrokerURL() {
  Broker_URL = MQTT_URL;
}

// MQTT connection options
const options = {
  clientId: generateClientId(),
  username: MQTT_USERNAME,
  password: MQTT_PASSWORD,
  // username: 'bio_mqtt',
  // password: 'P@ssw0rd',
  //   username: 'gNWx6jIp9X',
  // password: 'Fx6co2iTPy',
  clean: true,
};

let client: mqtt.MqttClient | null = null;
let subscribedTopics: Set<string> = new Set();
let messageCallbacks: { [topic: string]: ((data: any) => void)[] } = {};

export function startMQTTclient(messagecallback: any, topic: string) {
  if (typeof messagecallback === 'function') {
    if (!messageCallbacks[topic]) messageCallbacks[topic] = [];
    if (!messageCallbacks[topic].includes(messagecallback)) {
      messageCallbacks[topic].push(messagecallback);
    }
  }

  if (!client) {
    // 🚀 Use updated dynamic Broker_URL
    client = mqtt.connect(Broker_URL, options);

    client.on('connect', () => {
      Object.keys(messageCallbacks).forEach((t) => {
        console.log(`[MQTT] Subscribing to topic: ${t}`);
        if (!subscribedTopics.has(t)) {
          client!.subscribe(t, (err) => {
            if (!err) subscribedTopics.add(t);
          });
        }
      });
    });

    client.on('error', (err) => {
      console.log('MQTT error:', err);
    });

    client.on('message', (msgTopic, message) => {
      const message_str = message.toString();
      let data: unknown;

      try {
        data = JSON.parse(message_str);
        // console.log(`[MQTT] Message received on topic "${msgTopic}":`, data);
        Object.keys(messageCallbacks).forEach((subscribedTopic) => {
          const isMatch = matchTopic(subscribedTopic, msgTopic);

          if (isMatch) {
            messageCallbacks[subscribedTopic].forEach((cb) => cb(data));
          }
        });
      } catch (e) {
        console.warn(` Invalid JSON received on topic`, msgTopic);
      }
    });
  } else {
    if (!subscribedTopics.has(topic)) {
      client.subscribe(topic, (err) => {
        if (!err) subscribedTopics.add(topic);
      });
    }
  }

  return () => {
    if (messageCallbacks[topic]) {
      messageCallbacks[topic] = messageCallbacks[topic].filter((cb) => cb !== messagecallback);
      if (messageCallbacks[topic].length === 0) {
        client?.unsubscribe(topic);
        subscribedTopics.delete(topic);
        delete messageCallbacks[topic];
      }
    }
  };
}

export function unsubscribeAllMQTT() {
  if (!client) return;

  Object.keys(messageCallbacks).forEach((topic) => {
    client?.unsubscribe(topic);
    delete messageCallbacks[topic];
  });

  subscribedTopics.clear();
  console.log('[MQTT] All topics unsubscribed');
}

export function publishMQTT(topic: string, payload: any) {
  if (!client) {
    console.warn('MQTT client not ready');
    return;
  }

  const message = typeof payload === 'string' ? payload : JSON.stringify(payload);
  client.publish(topic, message);
}
