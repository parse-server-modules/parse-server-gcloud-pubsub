import events from 'events';
import PubSub from '@google-cloud/pubsub';
import path from 'path';
import uuid from 'uuid';
import { GCPUtil } from './util';

const namePrefix = 'parse-server';

let emitter = new events.EventEmitter();

/**
 * In order to use gcp pub/sub module we must provide 2 env. variables 
 * GCP_PROJECT_ID - the project id on GCP
 * GCP_KEYFILE_PATH - path where the google service account key is located 
 */
let options = GCPUtil.createOptionsFromEnvironment();

const pubsubClient = PubSub({
  projectId: options.projectId,
  keyFilename: options.keyFilename
});

class Publisher {

  constructor(emitter) {
    this.emitter = emitter;

    // process.on('SIGNINT',function(){
    //   process.exit();
    // });

    // process.on('SIGTERM',function(){
    //   process.exit();
    // });

  }

  publish(channel, message) {

    let topicName = `${namePrefix}-${channel}`;
    const topic = pubsubClient.topic(topicName);

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
    process.on('SIGNINT',function(){
      process.exit();
    });
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
          this._createSubscription(topic,channel);
        });
      } else {
        this._createSubscription(topic,channel);
      }
    });
  }

  unsubscribe(channel) {
    // Here we should get all the subscriptions under the channel topic and unsubscribe them
  }

  _createSubscription(topic,channel) {

    const subscriptionUUID = uuid.v1();
    var subscriptionName = `${namePrefix}-${channel}-${subscriptionUUID}`;

    topic.subscribe(subscriptionName, (err, subscription) => {
      if (err) {
        console.log(`Failed to create subscription ${err}`);
        return;
      }

      console.log(`Subscription ${subscription.name} created.`);

      subscription.on('message', (message) => {
        if (message.ackId) {
          message.ack();
        }
        let topicName = `${namePrefix}-${channel}`;
        this.emit('message', channel , message.data);
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