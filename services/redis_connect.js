'use strict';
const redis = require("redis");

let redisClient = redis.createClient(
    "   ",
    "127.0.0.1"
);

redisClient.on("error", function (error) { 
    console.error(error);
});
// await redisClient.on("ready", () => console.log(`Redis client is ready`));
redisClient.on("end", () => console.error(`Redis client has closed.`));
redisClient.on("reconnecting", (o) => {
    console.log(`Redis client is reconnecting.`);
    console.log(`Attempt number ${o}.`);
    console.log(`Milliseconds since last attempt: ${o}.`);
  });
redisClient.on("connect", () => {
    console.log('Redis client connected');
})

redisClient.on("warning", (o) => {
    console.log(`Redis client warning.`);
    console.log(`Attempt number ${o}.`);
    console.log(`Milliseconds since last attempt: ${o}.`);
  });

const getOrSetOnRedisDB = async (key, timeout ,callBackFunction) => {
    return new Promise(async(resolve, reject) => {
        await redisClient.get(key, async (err, data) => {
        if (err) {
            reject(err);
        }
        if (data == null) {
            resolve(JSON.parse(data));
            const freshData = await callBackFunction();
            if(freshData){
                await redisClient.set(key, JSON.stringify(freshData));
                if(timeout){
                    await redisClient.expire(key, timeout);
                }
            }
            resolve(freshData);
        }else{
            return resolve(JSON.parse(data));
        }
        
        });
    });
};

const setOnRedisDB = async (key, data, timeout) => {
    return new Promise(async(resolve, reject) => {
        await redisClient.set(key, JSON.stringify(data), async (err, data) => {
        if (err) {
            reject(err);
        }
        if(timeout){
            await redisClient.expire(key, timeout);
        }
        resolve(data);
        });
    });
}

const getFromRedisDB = async (key) => {
    return new Promise(async(resolve, reject) => {
        await redisClient.get(key, (err, data) => {
        if (err) {
            reject(err);
        }
        resolve(JSON.parse(data));
        });
    });
}


module.exports ={
    getOrSetOnRedisDB,
    redisClient,
    setOnRedisDB,
    getFromRedisDB,

};