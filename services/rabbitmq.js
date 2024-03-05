'use strict';
const amqp = require('amqplib');
let connection;
let channel;
const deadLetterQueueName = "dead-letter-queue";
// const redis = require('../services/redis_connect');

// Initialize connection and dead letter queue bindings
initializeWithDeadLetterQueue();

async function initializeWithDeadLetterQueue() {
    try {
        connection = await amqp.connect("amqp://localhost:5672");
        connection.on("error", handleError);
        connection.on("close", handleClose);
        channel = await connection.createChannel();
        console.log("AMQP connection established.");

        await channel.assertQueue(deadLetterQueueName);
        await channel.bindQueue(deadLetterQueueName, "amq.direct", deadLetterQueueName);
        console.log(`Dead letter queue '${deadLetterQueueName}' initialized.`);
    } catch (error) {
        console.error('Error initializing with dead letter queue:', error);
    }
}

const processMessage = (message, isDeadLater = false) => {
    console.log(`Message received from queue '${message.fields.routingKey}':`, JSON.parse(message.content.toString()));
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const random = Math.random();
            if (random < 0.5) {
                console.log("Message processed successfully.");
                resolve();
            } else {
                console.log("Message processing failed.");
                reject(new Error("Message processing failed."));
            }
        }, 1000);
    });
};

async function publishMessage(queueName, message) {
    try {
        // Ensure that the connection and channel are initialized
        if (!channel) {
            console.log("Channel is not initialized. Re-initializing...");
            await initializeWithDeadLetterQueue();
        }

        await channel.assertQueue(queueName);
        await channel.sendToQueue(queueName, Buffer.from(JSON.stringify(message)));
        // console.log(`Message sent to queue '${queueName}':`, message);

    } catch (error) {
        console.error('Error publishing message:', error);
    }
}

async function consumeMessages(queueName) {
    try {
        // Ensure that the connection and channel are initialized
        if (!channel) {
            console.log("Channel is not initialized. Re-initializing...");
            await initializeWithDeadLetterQueue();
        }

        if (queueName === deadLetterQueueName) {
            await channel.assertQueue(queueName);
            await channel.consume(queueName, async (message) => {
                if (message !== null) {
                    try {
                        console.log(`Message received from dead letter queue:`, JSON.parse(message.content.toString()));
                        await processMessage(message, isDeadLater = true);
                    } catch (error) {
                        // redis.getOrSetOnRedisDB('dead-letter-queue', message.toString());
                    }
                    channel.ack(message);
                }
            });
        } else {
            await channel.assertQueue(queueName);
            channel.consume(queueName, async (message) => {
                if (message !== null) {
                    try {
                        await processMessage(message);
                        channel.ack(message);
                    } catch (error) {
                        console.error('Error processing message:', error);

                        // Move the message to the dead letter queue
                        await channel.sendToQueue(deadLetterQueueName, message.content, { headers: message.properties.headers });
                        channel.ack(message);
                    }
                }
            });
        }
    } catch (error) {
        console.error('Error consuming messages:', error);
    }
}

function handleError(err) {
    console.error("AMQP connection error:", err.message);
}

function handleClose() {
    console.log("AMQP connection closed.");
}

module.exports = {
    publishMessage,
    consumeMessages
};
