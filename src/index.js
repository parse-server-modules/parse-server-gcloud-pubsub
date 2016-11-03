import events from 'events';
import PubSub from '@google-cloud/pubsub';
import path from 'path';
import uuid from 'uuid';
import {GCPUtil} from './util';


let emitter = new events.EventEmitter();

let options = {};
options = GCPUtil.requiredOrFromEnvironment(options,'projectId',process.env.GCP_PROJECT_ID);
options = GCPUtil.requiredOrFromEnvironment(options,'keyFilename',process.env.GCP_KEYFILE_PATH);


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
        
    const topic = pubsubClient.topic(channel);
    const uuid = uuid.v1(); 

    // construct unique subscription name 
    var subscriptionName = `parse-server-${channel}-${uuid}`;

    // TODO: use promises
    topic.subscribe(subscriptionName, (err, subscription) => {
      if (err) {
        return;
      }

      subscription.on('message', (message) => {
        if (message.ackId) {
          message.ack();
        }

        this.emit('message', channel, message.data);
      });

      console.log(`Subscription ${subscription.name} created.`);
    });
  }

  unsubscribe(channel) {  
    // Here we should get all the subscriptions under the channel topic and unsubscribe them
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