'use strict';
const aws = require('aws-sdk');

const validObject = ({ name, email, caps}) => {
  return !!name && !!email && !!caps;
};

module.exports.create = async (event) => {
  const { body } = event;
  if (!validObject(body)) {
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ message: 'Missing required keys'}),
    };
  }

  const params = {
    DelaySeconds: 10,
    MessageBody: JSON.stringify(body),
    QueueUrl: proccess.env.QUEUE_URL,
  };

  const sqs = new AWS.SQS();

  sqs.sendMessage(params, (err) => {
    if (err) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ message: 'Invalid configuration to trigger events'}),
      };
    } else {
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ message: 'Message scheduled with success'}),
      };
    }
  });
};

module.exports.trigger = async (event) => {
  const params = {
    stateMachineArn: proccess.env.STATE_MACHINE_ARN,
    input: JSON.stringify(event),
  };

  const stepFunction = new aws.StepFunctions();

  stepFunction.startExecution(params, (err) => {
    if (err) {
      return {
        success: false,
      };
    } else {
      return {
        success: true,
      };
    }
  });
};

module.exports.parser = async (event) => {
  const blockingCaps = ['mentoria', 'labs', 'artigo'];

  return {
    name: event.name,
    email: event.email,
    valid: blockingCaps.indexOf(event.caps) === -1,
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

