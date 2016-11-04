import events from 'events';
import PubSub from '@google-cloud/pubsub';
import path from 'path';
import uuid from 'uuid';
import { GCPUtil } from './util';

const namePrefix = 'parse-server';

let emitter = new events.EventEmitter();


let options = {};
options = GCPUtil.requiredOrFromEnvironment(options, 'projectId', 'GCP_PROJECT_ID');
options = GCPUtil.requiredOrFromEnvironment(options, 'keyFilename', 'GCP_KEYFILE_PATH');

const pubsubClient = PubSub({
  projectId: options.projectId,
  keyFilename: options.keyFilename
});

class Publisher {

  constructor(emitter) {
    this.emitter = emitter;
  }

  publish(channel, message) {

    const topic = pubsubClient.topic(channel);

    topic.publish(message, (err, messageIds) => {
      if (err) {
        return;
      }
    });
  }
};

class Subscriber extends events.EventEmitter {

  constructor() {
    super();
  }

  subscribe(channel) {

    let topicName = `${namePrefix}-${channel}`;
    const topic = pubsubClient.topic(topicName);

    /**
     * check if the topic that we want to create exist
     * if the topic not exist create a new topic based on the channel name
     * the topic name will be parse-server-{channel_name}
     *  */
    topic.exists((err, exists) => {
      if (!exists && !err) {
        topic.create((err, topic, apiResponse) => {
          if (err) {
            return;
          }
          this.createSubscription(topic,channel);
        });
      } else {
        this.createSubscription(topic,channel);
      }
    });
  }

  unsubscribe(channel) {
    // Here we should get all the subscriptions under the channel topic and unsubscribe them
  }

  createSubscription(topic,channel) {

    const subscriptionUUID = uuid.v1();
    var subscriptionName = `${namePrefix}-${channel}-${subscriptionUUID}`;

    topic.subscribe(subscriptionName, (err, subscription) => {
      console.log('callback');
      if (err) {
        console.log(`Failed to create subscription ${err}`);
        return;
      }

      console.log(`Subscription ${subscription.name} created.`);

      subscription.on('message', (message) => {
        if (message.ackId) {
          message.ack();
        }
        this.emit('message', channel, message.data);
      });
    });
  }
}


function createPublisher() {
  return new Publisher(emitter);
}

function createSubscriber() {
  return new Subscriber();
}

let GcpPubSub = {
  createPublisher,
  createSubscriber
}

export {
  GcpPubSub
}