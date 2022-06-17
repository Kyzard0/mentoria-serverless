'use strict';
const AWS = require('aws-sdk');

const validObject = ({ name, email, caps}) => {
  return !!name && !!email && !!caps;
};

const returnResponse = ({ status, body }) => {
  return {
    statusCode: status,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(body),
  };
};

const sendMessageToSQS = (params) => {
  const sqs = new AWS.SQS();
  return new Promise((resolve, reject) => {
    sqs.sendMessage(params, (err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(true);
    });
  });
};

const startStepExecution = (params) => {
  const stepFunction = new AWS.StepFunctions();
  return new Promise((resolve, reject) => {
    stepFunction.startExecution(params, (err) => {
      if (err) {
        reject(err);
        return;
      } else {
        resolve(true);
      }
    });
  });
};

module.exports.create = async ({ body }) => {
  try {
    const data = JSON.parse(body);
    if (!validObject(data)) {
      return returnResponse({
        status: 400,
        body: { message: 'Missing required keys'},
      });
    }

    const params = {
      DelaySeconds: 10,
      MessageBody: JSON.stringify(body),
      QueueUrl: process.env.QUEUE_URL,
    };

    await sendMessageToSQS(params);

    return returnResponse({
      status: 200,
      body: { message: 'Message scheduled with success'},
    });
  } catch (error) {
    console.log(error);
    return returnResponse({
      status: 400,
      body: { message: 'Unnexpected error' },
    });
  }
};

module.exports.trigger = async (event) => {
  const records = event.Records.map(r => JSON.parse(r.body));

  await Promise.all(
    records.map(body => {
      const params = {
        stateMachineArn: process.env.STATE_MACHINE_ARN,
        input: JSON.stringify(body),
      };
      return startStepExecution(params);
    }),
  );

  return true;
};

module.exports.parser = async (event) => {
  const blockingCaps = ['mentoria', 'labs', 'artigo'];
  const validCaps = ['palestra', 'workshop']
  const data = JSON.parse(event);
  const { name, email, caps} = data;
  return {
    name,
    email,
    valid: blockingCaps.indexOf(caps) === -1 && validCaps.indexOf(caps) >= 0,
  };
};

module.exports.approve = async (event) => {
  return {
    approved: true,
    email: event.email,
  };
};

module.exports.reject = async (event) => {
  return {
    approved: false,
    email: event.email,
  };
};

