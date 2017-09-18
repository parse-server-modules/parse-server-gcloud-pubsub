const events =  require('events');
const PubSub = require('@google-cloud/pubsub');
const path = require('path');
const uuid = require('uuid');

const namePrefix = 'parse-server';

let emitter = new events.EventEmitter();

// if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
//   throw 'set GOOGLE_APPLICATION_CREDENTIALS variable (see https://googlecloudplatform.github.io/google-cloud-node/#/docs/pubsub/0.8.0/guides/authentication)';
// }

// if (!process.env.GCLOUD_PROJECT) {
//   throw 'set GCLOUD_PROJECT variable (see https://googlecloudplatform.github.io/google-cloud-node/#/docs/pubsub/0.8.0/guides/authentication)';
// }


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

  constructor(options) {
    super();
    this.disableFanOut = options.disableFanOut || false;
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

  _createSubscription(topic, channel) {
    let subscriptionName;
    if (!this.disableFanOut) {
      const subscriptionUUID = uuid.v1();
      subscriptionName = `${namePrefix}-${channel}-${subscriptionUUID}`;
    } else {
      subscriptionName = `${namePrefix}-${channel}`;
    }

    topic.subscribe(subscriptionName, (err, subscription) => {

      if (err) {
        console.error(`Failed to create subscription ${err}`);
        return;
      }

      console.log(`Subscription ${subscription.name} created.`);
      
      function deleteSubscription() {
        removeListeners();
        console.log('Subscriber: Signal received, deleting subscription');
        subscription.delete().then(() => {
          console.log('Subscriber: subscription deleted...');
        }, (err) => {
          console.error(`Subscriber: Error deleting subscription`, err);
        });
      }
      
      function messageHandler(message) {
          if (message.ackId) {
            message.ack();
          }
          let topicName = `${namePrefix}-${channel}`;
          this.emit('message', channel , message.data);
      };

      function errorHandler(err) {
        console.error('Subscriber Error: ', err);
        // Handle when subscription gets deleted
        // Attempt to recreate it
        if (err.code == 404) {
          console.log('Subscriber: will recreate subscription');
          removeListeners();
          this._createSubscription(topic, channel);
        }
      }

      const onMessage = messageHandler.bind(this);
      const onError = errorHandler.bind(this);
      
      // Remove the listenerds
      function removeListeners() {
        subscription.removeListener('message', onMessage);
        subscription.removeListener('error', onError);
        process.removeListener('SIGTERM', deleteSubscription);
        process.removeListener('SIGINT', deleteSubscription);
      }

      // Handle termination, delete the subscription (require graceful shutdowm)
      process.on('SIGTERM', deleteSubscription);
      process.on('SIGINT', deleteSubscription);
      
      // Bind the subscription
      subscription.on('message', onMessage);
      subscription.on('error', onError);
    });
  }
}

function createPublisher() {
  return new Publisher(emitter);
}

function createSubscriber(options) {
  return new Subscriber(options);
}

module.exports = {
  createPublisher,
  createSubscriber
};
