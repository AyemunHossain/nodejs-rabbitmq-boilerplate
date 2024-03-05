const amqp = require('amqplib');
var connection;
var channel;

connectQueue();

async function connectQueue() {
    try {
        connection = await amqp.connect("amqp://localhost:5672");
        connection.on("error", handleError);
        connection.on("close", handleClose);
        channel = await connection.createChannel();
        console.log("AMQP connection established.")
    } catch (error) {
        console.log(error)
    }
}

async function publishMessage(queueName, message) {
    try {
        await channel.assertQueue(queueName);
        channel.sendToQueue(queueName, Buffer.from(JSON.stringify(message)));
        console.log(`Message sent to queue '${queueName}':`, message);
        await channel.close();
        await connection.close();
    } catch (error) {
        console.error('Error publishing message:', error);
    }
}

async function consumeMessages(queueName, processMessage) {
    try {
        await channel.assertQueue(queueName);
        channel.consume(queueName, (message) => {
            if (message !== null) {
                try {
                    processMessage(message);
                    channel.ack(message);
                } catch (error) {
                    console.error('Error processing message:', error);
                    
                    // Move the message to the dead letter queue
                    // channel.sendToQueue(deadLetterQueueName, message.content, {headers: message.properties.headers});
                    channel.ack(message);
                }
            }
        });
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