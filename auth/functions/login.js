'use strict';

const AWS = require('aws-sdk');
const authUtils = require('../auth-utils');
const corsHeaders = require('../../corsheaders');

const dynamoDb = new AWS.DynamoDB.DocumentClient();

module.exports.loginUser = async event => {
  const loginEvent = JSON.parse(event.body);

  if (!loginEvent.username || loginEvent.username === '') {
    return {
      statusCode: 400,
      headers: {
        ...corsHeaders,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        status: 'failed',
        message: 'Request body is missing username field!'
      })
    };
  }

  let username = loginEvent.username;

  const findUserParams = {
    TableName: 'user',
    Key: {
      name: username
    }
  };

  let userFromDb;
  try {
    userFromDb = await dynamoDb.get(findUserParams).promise();
  } catch (error) {
    return {
      statusCode: 400,
      headers: {
        ...corsHeaders,
        'content-type': 'application/json'
      },
      body: JSON.stringify(error)
    };
  }

  if (!userFromDb.Item || !userFromDb.Item.registered) {
    return {
      statusCode: 400,
      headers: {
        ...corsHeaders,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        status: 'failed',
        message: `Username ${username} does not exist`
      })
    };
  }

  let getAssertion = authUtils.generateServerGetAssertion(
    userFromDb.Item.authenticators
  );
  getAssertion.status = 'ok';

  const session = {
    challenge: getAssertion.challenge,
    username: username
  };

  // TODO secure requests with session cookie, ignoring for now
  //   request.session.challenge = challengeMakeCred.challenge;
  //   request.session.username = username;

  return {
    statusCode: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'Set-Cookie': `session=${JSON.stringify(session)}`
    },
    body: JSON.stringify(getAssertion)
  };
};
