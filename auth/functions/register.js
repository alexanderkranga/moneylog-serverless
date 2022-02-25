'use strict';

const uuid = require('uuid/v4');
const AWS = require('aws-sdk');
const authUtils = require('../auth-utils');
const corsHeaders = require('../../corsheaders');

const dynamoDb = new AWS.DynamoDB.DocumentClient();

module.exports.registerUser = async event => {
  const registerEvent = JSON.parse(event.body);

  if (!registerEvent.username || registerEvent.username === '') {
    return {
      statusCode: 400,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
      body: JSON.stringify({
        status: 'failed',
        message: 'Request body is missing username field!'
      })
    };
  }

  let username = registerEvent.username;

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

  if (userFromDb.Item && userFromDb.Item.registered) {
    return {
      statusCode: 400,
      headers: {
        ...corsHeaders,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        status: 'failed',
        message: `Username ${username} already exists`
      })
    };
  }

  const newUser = {
    name: username,
    registered: false,
    authenticators: [],
    id: uuid()
  };

  const params = {
    TableName: 'user',
    Item: newUser
  };

  try {
    await dynamoDb.put(params).promise();
  } catch (e) {
    return {
      statusCode: 400,
      headers: {
        ...corsHeaders,
        'content-type': 'application/json'
      },
      body: JSON.stringify(e)
    };
  }

  let challengeMakeCred = authUtils.generateServerMakeCredRequest(
    username,
    newUser.id
  );
  challengeMakeCred.status = 'ok';

  const session = {
    challenge: challengeMakeCred.challenge,
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
    body: JSON.stringify(challengeMakeCred)
  };
};
