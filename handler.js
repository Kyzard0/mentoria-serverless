'use strict';
const aws = require('aws-sdk');

const validObject = ({ name, email, caps}) => {
  return !!name && !!email && !!caps;
};

module.exports.create = async (event) => {
  if (!validObject(event)) {
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
    MessageBody: JSON.stringify(event),
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
    valid: !blockingCaps.includes(event.caps),
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

