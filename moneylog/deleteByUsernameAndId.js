'use strict';

const AWS = require('aws-sdk');

const dynamoDb = new AWS.DynamoDB.DocumentClient();

module.exports.deleteByUsernameAndId = async event => {
  let name;
  let id;
  if (event.pathParameters.username) {
    name = event.pathParameters.username;
  } else {
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'content-type': 'application/json'
      },
      body: { errorMessage: 'username cannot be null' }
    };
  }

  if (event.pathParameters.id) {
    id = event.pathParameters.id;
  } else {
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'content-type': 'application/json'
      },
      body: { errorMessage: 'log id cannot be empty' }
    };
  }

  const params = {
    TableName: 'logs',
    Key: {
      id: id
    },
    ConditionExpression: 'username = :username',
    ExpressionAttributeValues: {
      ':username': name
    }
  };

  try {
    await dynamoDb.delete(params).promise();
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'content-type': 'application/json'
      }
    };
  } catch (e) {
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'content-type': 'application/json'
      },
      body: JSON.stringify(e)
    };
  }
};
