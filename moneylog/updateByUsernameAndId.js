'use strict';

const AWS = require('aws-sdk');

const dynamoDb = new AWS.DynamoDB.DocumentClient();

module.exports.updateByUsernameAndId = async (event) => {
  let name;
  let id;
  if (event.pathParameters.username) {
    name = event.pathParameters.username;
  } else {
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'content-type': 'application/json',
      },
      body: { errorMessage: 'username cannot be null' },
    };
  }

  if (event.pathParameters.id) {
    id = event.pathParameters.id;
  } else {
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'content-type': 'application/json',
      },
      body: { errorMessage: 'log id cannot be empty' },
    };
  }

  const updatedLog = JSON.parse(event.body);

  const params = {
    TableName: 'logs',
    Key: { id: id },
    ConditionExpression: 'username = :username',
    UpdateExpression: getUpdateExpression(updatedLog),
    ExpressionAttributeValues: {
      ':username': name,
      ':currency': updatedLog.currency,
      ':amount': updatedLog.amount,
      ':description': updatedLog.description,
      ':log_type': updatedLog.log_type,
      ':created_date': updatedLog.created_date,
      ':log_frequency': updatedLog.log_frequency,
      ':start_time': updatedLog.start_time,
      ':end_time': updatedLog.end_time || null,
      ':repeat_frequency': updatedLog.repeat_frequency,
      ':repeat_period': updatedLog.repeat_period,
    },
  };

  try {
    await dynamoDb.update(params).promise();
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'content-type': 'application/json',
      },
    };
  } catch (e) {
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'content-type': 'application/json',
      },
      body: JSON.stringify(e),
    };
  }
};

const getUpdateExpression = (log) => {
  const updateExpressions = [];

  updateExpressions.push('currency = :currency');
  updateExpressions.push('amount = :amount');
  updateExpressions.push('description = :description');
  updateExpressions.push('log_type = :log_type');
  updateExpressions.push('created_date = :created_date');
  updateExpressions.push('log_frequency = :log_frequency');
  updateExpressions.push('end_time = :end_time');

  if (log.start_time) {
    updateExpressions.push('start_time = :start_time');
  }

  if (log.repeat_frequency) {
    updateExpressions.push('repeat_frequency = :repeat_frequency');
  }

  if (log.repeat_period) {
    updateExpressions.push('repeat_period = :repeat_period');
  }

  return 'set ' + updateExpressions.join(', ');
};
