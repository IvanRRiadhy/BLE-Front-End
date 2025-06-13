import React, { useEffect, useState } from 'react';
import {
  Stage,
  Layer,
  Rect,
  Circle,
  Star,
  Image as KonvaImage,
  RegularPolygon,
  Shape,
  Text,
  Line,
} from 'react-konva';
import { useSelector, useDispatch } from 'src/store/Store';
import mqtt from 'mqtt';

const Topic = "6A6AD6FA-5630-419A-B756-7685A0401FED";
const Broker_URL = "ws://192.168.1.165:9001";

const options = {
  clientId: "Klien1",
  username: "test1",
  password: "test1",
};

export function startMQTTclient(messagecallback: any){
            const client = mqtt.connect(Broker_URL, options);
  client.on("connect", mqtt_connect);
  client.on("error", mqtt_error);
  client.on("message", mqtt_messageReceived);
      function mqtt_connect() {
    client.subscribe(Topic, mqtt_subscribe);    
  }


  function mqtt_subscribe(err: any, granted: any) {
    console.log("Subscribed to " + Topic, granted);
    if (err) {
      console.log(err);
    }
  }

  function mqtt_error(err: any) {
    console.log("MQTT error:", err);
  }
  function mqtt_messageReceived(topic: any, message: any, packet: any) {
    // console.log("Message received: ", JSON.stringify(message), JSON.stringify(packet));
     const message_str = message.toString();
     const data = JSON.parse(message_str);
     console.log(data);
    
    
};

}
