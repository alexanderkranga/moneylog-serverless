'use strict';

const AWS = require('aws-sdk');

const dynamoDb = new AWS.DynamoDB.DocumentClient();

module.exports.getLogsByUsername = async event => {
  let name;
  if (event.pathParameters && event.pathParameters.username) {
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

  const params = {
    TableName: 'logs',
    FilterExpression: 'username = :username',
    ExpressionAttributeValues: { ':username': name }
  };

  try {
    let logsByUser = await dynamoDb.scan(params).promise();

    console.log('logs for user: ' + JSON.stringify(logsByUser.Items));

    logsByUser.Items = logsByUser.Items.sort((log1, log2) => {
      return log1.created_date > log2.created_date ? -1 : 1;
    });

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'content-type': 'application/json'
      },
      body: JSON.stringify(logsByUser.Items)
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
