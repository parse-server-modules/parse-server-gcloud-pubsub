const events =  require('events');
const PubSub = require('@google-cloud/pubsub');
const path = require('path');
const uuid = require('uuid');

const namePrefix = 'parse-server';

let emitter = new events.EventEmitter();

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  throw "set GOOGLE_APPLICATION_CREDENTIALS variable (see https://googlecloudplatform.github.io/google-cloud-node/#/docs/pubsub/0.8.0/guides/authentication)";
}

if (!process.env.GCLOUD_PROJECT) {
  throw "set GCLOUD_PROJECT variable (see https://googlecloudplatform.github.io/google-cloud-node/#/docs/pubsub/0.8.0/guides/authentication)";
}

/**
 * In order to use gcp pub/sub module we must provide 2 env. variables 
 * GCP_PROJECT_ID - the project id on GCP
 * GCP_KEYFILE_PATH - path where the google service account key is located 
 */
const pubsubClient = PubSub();

class Publisher {

  constructor(emitter) {
    this.emitter = emitter;
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
      process.on('SIGTERM', () => {
        console.log('Subscriber: SIGTERM received, deleting subscription');
        subscription.delete();
        console.log('Subscriber: subscription deleted...');
      });
      process.on('SIGINT', () => {
        console.log('Subscriber: SIGINT received, deleting subscription');
        subscription.delete();
        console.log('Subscriber: subscription deleted...');
      });
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

module.exports = GcpPubSub;