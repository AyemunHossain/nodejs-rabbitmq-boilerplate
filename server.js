'use strict';
const app = require('./app');
require('dotenv').config();
const port = process.env.PORT || 5000;
const rabbitmq = require('./services/rabbitmq');

for(let i=0; i<100; i++){
  rabbitmq.publishMessage('test-queue', { id: i, message: `Test message ${i}` });
}


rabbitmq.consumeMessages('test-queue');
rabbitmq.consumeMessages('dead-letter-queue');

app.listen(port, () => console.log(`Server running on port ${port}`));