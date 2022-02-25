'use strict';

const uuid = require('uuid/v4');
const AWS = require('aws-sdk');

const dynamoDb = new AWS.DynamoDB.DocumentClient();

module.exports.createLog = async event => {
  let name;
  if (event.pathParameters && event.pathParameters.username) {
    name = event.pathParameters.username;
  }

  const log = JSON.parse(event.body);

  if (!log || log === null) {
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'content-type': 'application/json'
      },
      body: { errorMessage: 'Request body cannot be null' }
    };
  }

  const params = {
    TableName: 'logs',
    Item: {
      id: uuid(),
      username: name,
      amount: log.amount,
      created_date: log.created_date,
      currency: log.currency,
      description: log.description,
      log_frequency: log.log_frequency,
      log_type: log.log_type,
      repeat_frequency: log.repeat_frequency,
      repeat_period: log.repeat_period,
      start_time: log.start_time,
      end_time: log.end_time
    }
  };

  try {
    await dynamoDb.put(params).promise();
    return {
      statusCode: 201,
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
