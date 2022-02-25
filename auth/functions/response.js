'use strict';

const base64url = require('base64url');
const AWS = require('aws-sdk');
const utils = require('../auth-utils');
const corsHeaders = require('../../corsheaders');

const dynamoDb = new AWS.DynamoDB.DocumentClient();

module.exports.handleRegisterResponse = async event => {
  const responseEventBody = JSON.parse(event.body);

  if (
    !responseEventBody.id ||
    !responseEventBody.rawId ||
    !responseEventBody.response ||
    !responseEventBody.type ||
    responseEventBody.type !== 'public-key'
  ) {
    return {
      statusCode: 400,
      headers: {
        ...corsHeaders,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        status: 'failed',
        message: 'Request body is missing required fields'
      })
    };
  }

  let clientData = JSON.parse(
    base64url.decode(responseEventBody.response.clientDataJSON)
  );

  const responseCookie = JSON.parse(
    event.headers.cookie.replace('session=', '')
  ); // stupid workaround
  /* Check challenge... */
  console.log(responseCookie);

  if (clientData.challenge !== responseCookie.challenge) {
    return {
      statusCode: 400,
      headers: {
        ...corsHeaders,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        status: 'failed',
        message: "Challenges don't match!"
      })
    };
  }

  /* ...and origin */
  // if(clientData.origin !== config.origin) {
  //     response.json({
  //         'status': 'failed',
  //         'message': 'Origins don\'t match!'
  //     })
  //     return;
  // }

  let result;
  if (responseEventBody.response.attestationObject !== undefined) {
    /* This is create cred */
    result = utils.verifyAuthenticatorAttestationResponse(responseEventBody);

    if (result.verified) {
      const username = responseCookie.username;

      const updateUserParams = {
        TableName: 'user',
        Key: { name: username },
        ConditionExpression: '#name = :username',
        UpdateExpression:
          'set authenticators = :authenticators, registered = :registered',
        ExpressionAttributeValues: {
          ':username': username,
          ':authenticators': new Array(result.authrInfo),
          ':registered': true
        },
        ExpressionAttributeNames: {
          '#name': 'name'
        }
      };

      try {
        await dynamoDb.update(updateUserParams).promise();
      } catch (error) {
        console.log('error updating user in db: ' + JSON.stringify(error));
        return {
          statusCode: 400,
          headers: {
            ...corsHeaders,
            'content-type': 'application/json'
          },
          body: JSON.stringify(error)
        };
      }
    }
  } else if (responseEventBody.response.authenticatorData !== undefined) {
    /* This is get assertion */
    const username = responseCookie.username;

    const getUserParams = {
      TableName: 'user',
      FilterExpression: '#name = :username',
      ExpressionAttributeValues: { ':username': username },
      ExpressionAttributeNames: {
        '#name': 'name'
      }
    };

    try {
      const userFromDb = await dynamoDb.scan(getUserParams).promise();
      result = utils.verifyAuthenticatorAssertionResponse(
        responseEventBody,
        userFromDb.Items[0].authenticators
      );
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
  } else {
    return {
      statusCode: 400,
      headers: {
        ...corsHeaders,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        status: 'failed',
        message: 'Cannot determine type of response'
      })
    };
  }

  console.log('result before returning status: ' + JSON.stringify(result));

  if (result.verified) {
    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'content-type': 'application/json',
        'Set-Cookie': `session=${JSON.stringify({
          ...responseCookie,
          loggedIn: true
        })}`
      },
      body: JSON.stringify({ status: 'ok' })
    };
  } else {
    return {
      statusCode: 400,
      headers: {
        ...corsHeaders,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        status: 'failed',
        message: 'Can not authenticate signature'
      })
    };
  }
};
