import { uniqueId } from 'lodash';
import mqtt from 'mqtt';

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

const Broker_URL = 'ws://192.168.1.116:9005';
const options = {
  clientId: generateClientId(),
  username: 'bio_mqtt',
  password: 'P@ssw0rd',
  clean: true,
};

let client: mqtt.MqttClient | null = null;
let subscribedTopics: Set<string> = new Set();
let messageCallbacks: { [topic: string]: ((data: any) => void)[] } = {};
let messageLogs: { [topic: string]: string[] } = {};

// Log message with timestamp to memory
function logMessage(topic: string, message: string) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}`;

  // Store in memory
  if (!messageLogs[topic]) messageLogs[topic] = [];
  messageLogs[topic].push(logEntry);

  // Keep only last 100 messages per topic to prevent memory issues
  if (messageLogs[topic].length > 100) {
    messageLogs[topic] = messageLogs[topic].slice(-100);
  }

  // Log to console
  // console.log(`MQTT [${topic}]:`, logEntry);
}

// Get logs for a specific topic
export function getTopicLogs(topic: string): string[] {
  return messageLogs[topic] || [];
}

// Get all topics that have logs
export function getAllLoggedTopics(): string[] {
  return Object.keys(messageLogs).filter((topic) => messageLogs[topic].length > 0);
}

// Download ALL logs in a single file with sections
export function downloadAllLogs() {
  const topics = getAllLoggedTopics();

  if (topics.length === 0) {
    alert('No logs available to download');
    return;
  }

  let fullLog = `MQTT Logs - Generated: ${new Date().toISOString()}\n`;
  fullLog += `Total Topics: ${topics.length}\n`;
  fullLog += '='.repeat(50) + '\n\n';

  topics.forEach((topic) => {
    const logs = messageLogs[topic];
    fullLog += `// ${topic}\n`;
    fullLog += `// Messages: ${logs.length}\n`;

    logs.forEach((logEntry) => {
      fullLog += `${logEntry}\n`;
    });

    fullLog += '\n'; // Add spacing between topics
  });

  // Create and trigger download
  const blob = new Blob([fullLog], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mqtt_all_topics_${Date.now()}.log`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Download specific topics only
export function downloadSelectedTopics(selectedTopics: string[]) {
  const availableTopics = selectedTopics.filter(
    (topic) => messageLogs[topic] && messageLogs[topic].length > 0,
  );

  if (availableTopics.length === 0) {
    alert('No logs available for selected topics');
    return;
  }

  let fullLog = `MQTT Logs - Generated: ${new Date().toISOString()}\n`;
  fullLog += `Selected Topics: ${availableTopics.length}\n`;
  fullLog += '='.repeat(50) + '\n\n';

  availableTopics.forEach((topic) => {
    const logs = messageLogs[topic];
    fullLog += `// ${topic}\n`;
    fullLog += `// Messages: ${logs.length}\n`;

    logs.forEach((logEntry) => {
      fullLog += `${logEntry}\n`;
    });

    fullLog += '\n';
  });

  const blob = new Blob([fullLog], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mqtt_selected_topics_${Date.now()}.log`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Clear all logs
export function clearAllLogs() {
  messageLogs = {};
}

// Clear logs for specific topic
export function clearTopicLogs(topic: string) {
  delete messageLogs[topic];
}

// Helper function to format time with milliseconds
function formatTimeWithMS(date: Date): string {
  const timeString = date.toLocaleTimeString('en-US', {
    hour12: true,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  // Manually add milliseconds
  const milliseconds = date.getMilliseconds().toString().padStart(3, '0');
  return `${timeString}.${milliseconds}`;
}

// Helper function to format the MQTT time
function formatMQTTTime(timeString: string): string {
  try {
    const date = new Date(timeString);
    return formatTimeWithMS(date);
  } catch (e) {
    return 'Invalid Time';
  }
}

export function startMQTTclient(messagecallback: any, topic: string) {
  if (typeof messagecallback === 'function') {
    if (!messageCallbacks[topic]) messageCallbacks[topic] = [];
    if (!messageCallbacks[topic].includes(messagecallback)) {
      messageCallbacks[topic].push(messagecallback);
    }
  }

  if (!client) {
    client = mqtt.connect(Broker_URL, options);

    client.on('connect', () => {
      Object.keys(messageCallbacks).forEach((t) => {
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

        // Extract the first item (assuming array structure)
        const item = Array.isArray(data) ? data[0] : data;

        // if (item && typeof item === 'object') {
        //   const timestamp = formatTimeWithMS(new Date());
        //   const x = (item as any).point?.x?.toFixed(2) || 'N/A';
        //   const y = (item as any).point?.y?.toFixed(2) || 'N/A';
        //   const beaconId = (item as any).beaconId || (item as any).cardName || 'Unknown';
        //   const mqttTime = (item as any).time ? formatMQTTTime((item as any).time) : 'N/A';

        //   console.log(
        //     `[${timestamp}] : Position { X: "${x}", Y: "${y}" }, Beacon: "${beaconId}", MQTT Time: ${mqttTime}`,
        //   );
        // } else {
        //   console.log('Received message on topic', msgTopic, ':', data);
        // }

        // Log the full message to memory (for download functionality)
        logMessage(msgTopic, message_str);

        (messageCallbacks[msgTopic] || []).forEach((cb) => cb(data));
      } catch (e) {
        const timestamp = formatTimeWithMS(new Date());
        console.warn(`[${timestamp}] Invalid JSON received on topic`, msgTopic, ':', message_str);
        logMessage(msgTopic, `INVALID JSON: ${message_str}`);
      }
    });
  } else {
    if (!subscribedTopics.has(topic)) {
      console.log(subscribedTopics, topic);
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
