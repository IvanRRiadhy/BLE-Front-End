import mqtt from 'mqtt';

// const Topic = "D2D3032D-77C9-4DAE-91B2-CC3770668D01";
const Broker_URL = "ws://192.168.1.116:9001";

const options = {
  clientId: "Klien1",
  username: "bio_mqtt",
  password: "P@ssw0rd",
};

let client: mqtt.MqttClient | null = null;
let subscribedTopics: Set<string> = new Set();
let messageCallbacks: { [topic: string]: ((data: any) => void)[] } = {};

export function startMQTTclient(messagecallback: any, topic: string) {
  // Register callback for this topic
  if (typeof messagecallback === 'function') {
    if (!messageCallbacks[topic]) messageCallbacks[topic] = [];
    if (!messageCallbacks[topic].includes(messagecallback)) {
      messageCallbacks[topic].push(messagecallback);
    }
  }

  if (!client) {
    client = mqtt.connect(Broker_URL, options);

    client.on("connect", () => {
      // Subscribe to all topics that have callbacks
      Object.keys(messageCallbacks).forEach((t) => {
        if (!subscribedTopics.has(t)) {
          client!.subscribe(t, (err, granted) => {
            if (!err) subscribedTopics.add(t);
          });
        }
      });
    });

    client.on("error", (err) => {
      console.log("MQTT error:", err);
    });

    client.on("message", (msgTopic, message, packet) => {
      const message_str = message.toString();
      let data: unknown;
      try {
        data = JSON.parse(message_str);
        // console.log("Received message on topic", msgTopic, ":", data);
        (messageCallbacks[msgTopic] || []).forEach(cb => cb(data));
      } catch (e) {
        console.warn("Invalid JSON received on topic", msgTopic, ":", message_str);
      }
    });
  } else {
    // If already connected, subscribe to new topic if needed
    if (!subscribedTopics.has(topic)) {
        console.log(subscribedTopics, topic);
      client.subscribe(topic, (err, granted) => {
        if (!err) subscribedTopics.add(topic);
      });
    }
  }

  // Return unsubscribe function
  return () => {
    if (messageCallbacks[topic]) {

      messageCallbacks[topic] = messageCallbacks[topic].filter(cb => cb !== messagecallback);
      if (messageCallbacks[topic].length === 0) {
        // Optionally unsubscribe from topic if no callbacks left
        client?.unsubscribe(topic);
        subscribedTopics.delete(topic);
        delete messageCallbacks[topic];
      }
    }
  };
}