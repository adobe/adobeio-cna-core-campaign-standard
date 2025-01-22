/*
Copyright 2019 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const loggerNamespace = 'aio-lib-campaign-standard'
const logger = require('@adobe/aio-lib-core-logging')(loggerNamespace, { level: process.env.LOG_LEVEL })

/** Reduce an Error to a string */
/**
 * Reduces an error object to a simplified string representation.
 *
 * @param {object} [error={}] - The error object to be reduced.
 * @param {object} [error.response] - The response object from the error.
 * @param {number} [error.response.status] - The HTTP status code of the response.
 * @param {string} [error.response.statusText] - The status text of the response.
 * @param {object} [error.response.body] - The body of the response.
 * @returns {string|object} A string representation of the error if response details are available, otherwise the original error object.
 */
function reduceError (error = {}) {
  const response = error.response
  if (response) {
    if (response.status && response.statusText && response.body) {
      return `${response.status} - ${response.statusText} (${JSON.stringify(response.body)})`
    }
  }

  return error
}

/**
 * Creates request options for API calls.
 *
 * @param {object} params - The parameters for creating request options.
 * @param {string} params.tenantId - The tenant ID for the organization.
 * @param {string} params.apiKey - The API key for authentication.
 * @param {string} params.accessToken - The access token for authentication.
 * @param {object} [params.body={}] - The request body to be sent with the API call.
 * @returns {object} The request options including requestBody, securities, and serverVariables.
 */
function createRequestOptions ({ tenantId, apiKey, accessToken, body = {} }) {
  return {
    requestBody: body,
    securities: {
      authorized: {
        BearerAuth: { value: accessToken },
        ApiKeyAuth: { value: apiKey }
      }
    },
    serverVariables: {
      ORGANIZATION: tenantId
    }
  }
}

/**
 * Intercepts and logs the details of a request.
 *
 * @param {object} req - The request object to be intercepted.
 * @returns {object} The same request object after logging.
 */
function requestInterceptor (req) {
  logger.debug(`REQUEST:\n ${JSON.stringify(req, null, 2)}`)
  return req
}

/**
 * Intercepts and processes the response object.
 *
 * Logs the response object and, if the response is OK, attempts to parse and log the response text.
 *
 * @param {Response} res - The response object to be intercepted.
 * @returns {Response} The original response object.
 */
function responseInterceptor (res) {
  logger.debug(`RESPONSE:\n ${JSON.stringify(res, null, 2)}`)
  if (res.ok) {
    let text
    try {
      text = res.text.toString('utf-8')
      logger.debug(`DATA\n, ${JSON.stringify(JSON.parse(text), null, 2)}`)
    } catch (e) {
      logger.debug(`DATA\n ${text}`)
    }
  }
  return res
}

module.exports = {
  createRequestOptions,
  requestInterceptor,
  responseInterceptor,
  reduceError
}
