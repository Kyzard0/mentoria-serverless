'use strict';
const AWS = require('aws-sdk');

const validObject = ({ name, email, caps, phoneNumber }) => {
  return !!name && !!email && !!caps && !!phoneNumber;
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

const sendSMSMessage = async (params) => {
  const pinPoint = new AWS.Pinpoint();
  const pinPointApplicationId = process.env.PINPOINT_APPLICATION_ID;
  const { phoneNumber, body } = params;
  const message = {
    ApplicationId: pinPointApplicationId,
    MessageRequest: {
      Addresses: {
        [phoneNumber]: {
          ChannelType: 'SMS'
        }
      }
    },
    MessageConfiguration: {
      SMSMessage: {
        MessageType: 'TRANSACTIONAL',
        Body: body
      }
    }
  };

  try {
    await pinPoint.sendMessages(message).promise();
    console.log(params);
  } catch (err) {
    console.log(err);
  }
}

module.exports.create = async ({ body }) => {
  try {
    const data = JSON.parse(body);
    if (!validObject(data)) {
      return returnResponse({
        status: 400,
        body: { message: 'Missing required keys' },
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
      body: { message: 'Message scheduled with success' },
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
  const { name, email, caps, phoneNumber } = data;
  return {
    name,
    email,
    phoneNumber,
    valid: blockingCaps.indexOf(caps) === -1 && validCaps.indexOf(caps) >= 0,
  };
};

module.exports.approve = async (event) => {
  const message = {
    phoneNumber: event.phoneNumber,
    body: `Sua participação no ${event.caps} foi aprovada.`
  }
  await sendSMSMessage(message);
  return {
    approved: true,
    email: event.email,
  };
};

module.exports.reject = async (event) => {
  const message = {
    phoneNumber: event.phoneNumber,
    body: `Sua participação no ${event.caps} foi rejeitada.`
  }
  await sendSMSMessage(message);
  return {
    approved: false,
    email: event.email,
  };
};

