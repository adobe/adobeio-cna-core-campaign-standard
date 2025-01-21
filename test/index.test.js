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

const sdk = require('../src')
const { createRequestOptions } = require('../src/helpers')
const { codes } = require('../src/SDKErrors')

// /////////////////////////////////////////////

const gTenantId = 'test-company'
const gApiKey = 'test-apikey'
const gAccessToken = 'test-token'

// /////////////////////////////////////////////

/**
 * Creates Swagger options for a request.
 *
 * @param {object} [options] - The options for the request.
 * @param {object} [options.body] - The body of the request.
 * @returns {object} The request options including tenantId, apiKey, accessToken, and body.
 */
const createSwaggerOptions = ({ body } = {}) => {
  return createRequestOptions({
    tenantId: gTenantId,
    apiKey: gApiKey,
    accessToken: gAccessToken,
    body
  })
}

/**
 * Initializes the SDK client with the provided tenant ID, API key, and access token.
 *
 * @returns {Promise<object>} A promise that resolves to the initialized SDK client.
 */
const createSdkClient = async () => {
  return sdk.init(gTenantId, gApiKey, gAccessToken)
}

// /////////////////////////////////////////////

beforeEach(() => {
  fetchMock.resetMocks()
})

test('sdk init test', async () => {
  const sdkClient = await createSdkClient()

  expect(sdkClient.tenantId).toBe(gTenantId)
  expect(sdkClient.apiKey).toBe(gApiKey)
  expect(sdkClient.accessToken).toBe(gAccessToken)
})

test('sdk init test - no tenantId', async () => {
  return expect(sdk.init(null, gApiKey, gAccessToken)).rejects.toEqual(
    new codes.ERROR_SDK_INITIALIZATION({ messageValues: 'tenantId' })
  )
})

test('sdk init test - no apiKey', async () => {
  return expect(sdk.init(gTenantId, null, gAccessToken)).rejects.toEqual(
    new codes.ERROR_SDK_INITIALIZATION({ messageValues: 'apiKey' })
  )
})

test('sdk init test - no accessToken', async () => {
  return expect(sdk.init(gTenantId, gApiKey, null)).rejects.toEqual(
    new codes.ERROR_SDK_INITIALIZATION({ messageValues: 'accessToken' })
  )
})

/**
 * Runs a standard test for an SDK function, verifying both success and failure cases.
 * @param {object} options - The options for the test.
 * @param {string} options.fullyQualifiedApiName - The fully qualified name of the API function.
 * @param {object} options.apiParameters - The parameters to pass to the API function.
 * @param {object} options.apiOptions - The options to pass to the API function.
 * @param {string} [options.sdkFunctionName] - The name of the SDK function to test. Defaults to the API function name without the namespace.
 * @param {Array} options.sdkArgs - The arguments to pass to the SDK function.
 * @param {object} [options.successReturnValue={}] - The value to return when the API call is successful.
 * @param {Function} options.ErrorClass - The error class to use when the API call fails.
 * @throws {Error} If `ErrorClass` is not defined.
 * @returns {Promise<void>} A promise that resolves when the test is complete.
 */
async function standardTest ({
  fullyQualifiedApiName, apiParameters, apiOptions,
  sdkFunctionName, sdkArgs,
  successReturnValue = {},
  ErrorClass
}) {
  const sdkClient = await createSdkClient()
  const [, apiFunction] = fullyQualifiedApiName.split('.')

  if (!ErrorClass) {
    throw new Error('ErrorClass not defined for standardTest')
  }

  // sdk function name is the same as the apiname (without the namespace) by default
  // so if it is not set, we set it
  // this means in the SDK the namespace is flattened, so functions have to have unique names
  if (!sdkFunctionName) {
    sdkFunctionName = apiFunction
  }
  const fn = sdkClient[sdkFunctionName]
  let mockFn

  // success case
  mockFn = sdkClient.sdk.mockResolved(fullyQualifiedApiName, successReturnValue)
  await expect(fn.apply(sdkClient, sdkArgs)).resolves.toEqual(successReturnValue)
  expect(mockFn).toHaveBeenCalledWith(apiParameters, apiOptions)

  // failure case
  const err = new Error('some API error')
  mockFn = sdkClient.sdk.mockRejected(fullyQualifiedApiName, err)
  await expect(fn.apply(sdkClient, sdkArgs)).rejects.toEqual(
    new ErrorClass({ sdkDetails: { ...sdkArgs }, messageValues: err })
  )
  expect(mockFn).toHaveBeenCalledWith(apiParameters, apiOptions)
}

test('getAllProfiles', async () => {
  const sdkArgs = [{ email: 'name@example.com' }]
  const apiParameters = { EXT: '', FILTERS: [], freeForm: { email: 'name@example.com' } } // equiv to default
  const apiOptions = createSwaggerOptions({ body: null })

  return expect(() => standardTest({
    fullyQualifiedApiName: 'profile.getAllProfiles',
    apiParameters,
    apiOptions,
    sdkArgs,
    ErrorClass: codes.ERROR_GET_ALL_PROFILES
  })).not.toThrow()
})

test('getAllProfiles - with filters', async () => {
  /**
   * Creates an array of SDK arguments with specified options.
   *
   * @param {object} options - The options for creating SDK arguments.
   * @param {boolean} options.descendingSort - Indicates if the sorting should be in descending order.
   * @returns {Array<object>} An array containing a single object with SDK arguments.
   */
  function createSdkArgs ({ descendingSort }) {
    return [
      {
        filters: ['byEmail', 'byText', 'myCustomFilter'],
        hasCustomFilter: true,
        lineCount: 10,
        order: 'email',
        descendingSort
      }
    ]
  }

  /**
   * Creates API parameters for a request.
   *
   * @param {object} options - The options for creating API parameters.
   * @param {boolean} options.descendingSort - Determines the sort order of the email field.
   * @returns {object} The API parameters.
   */
  function createApiParameters ({ descendingSort }) {
    return {
      FILTERS: 'byEmail/byText/myCustomFilter',
      EXT: 'Ext',
      _lineCount: 10,
      _order: descendingSort ? 'email%20desc' : 'email',
      freeForm: {}
    }
  }

  const apiOptions = createSwaggerOptions({ body: null })

  // descending sort
  await standardTest({
    fullyQualifiedApiName: 'profile.getAllProfiles',
    apiParameters: createApiParameters({ descendingSort: true }),
    apiOptions,
    sdkArgs: createSdkArgs({ descendingSort: true }),
    ErrorClass: codes.ERROR_GET_ALL_PROFILES
  })

  // ascending sort
  return expect(() => standardTest({
    fullyQualifiedApiName: 'profile.getAllProfiles',
    apiParameters: createApiParameters({ descendingSort: false }),
    apiOptions,
    sdkArgs: createSdkArgs({ descendingSort: false }),
    ErrorClass: codes.ERROR_GET_ALL_PROFILES
  })).not.toThrow()
})

test('createProfile', async () => {
  const profileObject = { firstName: 'Jack', lastName: 'Smith', email: 'foo@bar.com' }

  const sdkArgs = [profileObject]
  const apiParameters = { EXT: '', FILTERS: [], freeForm: {} }

  const apiOptions = createSwaggerOptions({ body: profileObject })

  return expect(() => standardTest({
    fullyQualifiedApiName: 'profile.createProfile',
    apiParameters,
    apiOptions,
    sdkArgs,
    ErrorClass: codes.ERROR_CREATE_PROFILE
  })).not.toThrow()
})

test('updateProfile', async () => {
  const pkey = '@agsagasgasgasgasg313'
  const profileObject = { firstName: 'Jack', lastName: 'Smith', email: 'foo@bar.com' }

  const sdkArgs = [pkey, profileObject]
  const apiParameters = { PROFILE_PKEY: pkey }
  const apiOptions = createSwaggerOptions({ body: profileObject })

  return expect(() => standardTest({
    fullyQualifiedApiName: 'profile.updateProfile',
    apiParameters,
    apiOptions,
    sdkArgs,
    ErrorClass: codes.ERROR_UPDATE_PROFILE
  })).not.toThrow()
})

test('getProfile', async () => {
  const pkey = '@agsagasgasgasgasg313'

  const sdkArgs = [pkey]
  const apiParameters = { PROFILE_PKEY: pkey }
  const apiOptions = createSwaggerOptions({ body: null })

  return expect(() => standardTest({
    fullyQualifiedApiName: 'profile.getProfile',
    apiParameters,
    apiOptions,
    sdkArgs,
    ErrorClass: codes.ERROR_GET_PROFILE
  })).not.toThrow()
})

test('getAllServices', async () => {
  const sdkArgs = []
  const apiParameters = { EXT: '', FILTERS: [], freeForm: {} } // equiv to default
  const apiOptions = createSwaggerOptions({ body: null })

  return expect(() => standardTest({
    fullyQualifiedApiName: 'service.getAllServices',
    apiParameters,
    apiOptions,
    sdkArgs,
    ErrorClass: codes.ERROR_GET_ALL_SERVICES
  })).not.toThrow()
})

test('createService', async () => {
  const serviceObject = {
    desc: 'service description',
    label: 'My newsletter',
    messageType: 'email',
    name: 'newsletter1',
    start: '2019-04-06'
  }

  const sdkArgs = [serviceObject]
  const apiParameters = { EXT: '', FILTERS: [], freeForm: {} }
  const apiOptions = createSwaggerOptions({ body: serviceObject })

  return expect(() => standardTest({
    fullyQualifiedApiName: 'service.createService',
    apiParameters,
    apiOptions,
    sdkArgs,
    ErrorClass: codes.ERROR_CREATE_SERVICE
  })).not.toThrow()
})

test('getService', async () => {
  const pkey = '@agsagasgasgasgasg313'

  const sdkArgs = [pkey]
  const apiParameters = { SERVICE_PKEY: pkey }
  const apiOptions = createSwaggerOptions({ body: null })

  return expect(() => standardTest({
    fullyQualifiedApiName: 'service.getService',
    apiParameters,
    apiOptions,
    sdkArgs,
    ErrorClass: codes.ERROR_GET_SERVICE
  })).not.toThrow()
})

test('getHistoryOfProfile', async () => {
  const pkey = '@agsagasgasgasgasg313'

  const sdkArgs = [pkey]
  const apiParameters = { PROFILE_PKEY: pkey }
  const apiOptions = createSwaggerOptions({ body: null })

  return expect(() => standardTest({
    fullyQualifiedApiName: 'history.getHistoryOfProfile',
    apiParameters,
    apiOptions,
    sdkArgs,
    ErrorClass: codes.ERROR_GET_HISTORY_OF_PROFILE
  })).not.toThrow()
})

test('getMetadataForResource', async () => {
  const resource = 'profile'

  const sdkArgs = [resource]
  const apiParameters = { RESOURCE: resource }
  const apiOptions = createSwaggerOptions({ body: null })

  return expect(() => standardTest({
    fullyQualifiedApiName: 'metadata.getMetadataForResource',
    apiParameters,
    apiOptions,
    sdkArgs,
    ErrorClass: codes.ERROR_GET_METADATA_FOR_RESOURCE
  })).not.toThrow()
})

test('getMetadataForResource - invalid resource', async () => {
  const resource = 'gibberish'
  const sdkClient = await createSdkClient()

  return expect(sdkClient.getMetadataForResource(resource)).rejects.toEqual(
    new codes.ERROR_INVALID_RESOURCE_TYPE({ messageValues: 'profile, service, history' })
  )
})

test('getCustomResources', async () => {
  const sdkArgs = []
  const apiParameters = {}
  const apiOptions = createSwaggerOptions({ body: null })

  return expect(() => standardTest({
    fullyQualifiedApiName: 'metadata.getCustomResources',
    apiParameters,
    apiOptions,
    sdkArgs,
    ErrorClass: codes.ERROR_GET_CUSTOM_RESOURCES
  })).not.toThrow()
})

test('createGDPRRequest', async () => {
  const gdprRequest = {
    name: 'PT11832',
    namespaceName: 'AMCDS2',
    reconciliationValue: 'customers@adobe.com',
    label: 'Delete customers',
    type: 'delete'
  }

  const sdkArgs = [gdprRequest]
  const apiParameters = {}
  const apiOptions = createSwaggerOptions({ body: gdprRequest })

  return expect(() => standardTest({
    fullyQualifiedApiName: 'gdpr.createGDPRRequest',
    apiParameters,
    apiOptions,
    sdkArgs,
    ErrorClass: codes.ERROR_CREATE_GDPR_REQUEST
  })).not.toThrow()
})

test('getGDPRRequest', async () => {
  const sdkArgs = []
  const apiParameters = {}
  const apiOptions = createSwaggerOptions({ body: null })

  return expect(() => standardTest({
    fullyQualifiedApiName: 'gdpr.getGDPRRequest',
    apiParameters,
    apiOptions,
    sdkArgs,
    ErrorClass: codes.ERROR_GET_GDPR_REQUEST
  })).not.toThrow()
})

test('getGDPRDataFile - success', async () => {
  const privacyDataRequestUrl = 'https://fake.site/'
  const requestInternalName = 'my-name'

  const expectedResult = { data: '12345' }
  fetchMock.mockResponseOnce(JSON.stringify(expectedResult))

  // this API function does not go through Swagger Client at all,
  // and goes through node-fetch
  const client = await createSdkClient()
  const triggerSuccess = client.getGDPRDataFile(privacyDataRequestUrl, requestInternalName)

  expect(fetchMock.mock.calls.length).toEqual(1)
  // [0][0] -> [call-index][argument-index], so first call's first argument
  const requestObject = fetchMock.mock.calls[0][0]
  const requestInternalsSymbol = Object.getOwnPropertySymbols(requestObject).find(item => String(item) === 'Symbol(Request internals)')

  expect(requestObject[requestInternalsSymbol].parsedURL.href).toEqual(privacyDataRequestUrl)
  return expect(triggerSuccess).resolves.toEqual(expectedResult)
})

test('getGDPRDataFile - error', async () => {
  const privacyDataRequestUrl = 'https://fake.site/'
  const requestInternalName = 'my-name'

  const expectedError = new Error('Foo')
  fetchMock.mockRejectOnce(expectedError)

  // this API function does not go through Swagger Client at all,
  // and goes through node-fetch
  const client = await createSdkClient()

  const triggerFail = client.getGDPRDataFile(privacyDataRequestUrl, requestInternalName)
  const sdkDetails = { privacyDataRequestUrl, requestInternalName }

  expect(fetchMock.mock.calls.length).toEqual(1)
  // [0][0] -> [call-index][argument-index], so first call's first argument
  const requestObject = fetchMock.mock.calls[0][0]
  const requestInternalsSymbol = Object.getOwnPropertySymbols(requestObject).find(item => String(item) === 'Symbol(Request internals)')

  expect(requestObject[requestInternalsSymbol].parsedURL.href).toEqual(privacyDataRequestUrl)
  return expect(triggerFail).rejects.toEqual(new codes.ERROR_GET_GDPR_DATA_FILE({ sdkDetails, messageValues: expectedError }))
})

test('sendTransactionalEvent', async () => {
  const eventId = 'foo-bar-321'
  const eventBody =
  {
    email: 'test@example.com',
    scheduled: '2017-12-01 08:00:00.768Z',
    expiration: '2017-12-31 08:00:00.768Z',
    ctx:
    {
      cartAmount: '$ 125',
      lastProduct: 'Leather motorbike jacket',
      firstName: 'Jack'
    }
  }

  const sdkArgs = [eventId, eventBody]
  const apiParameters = { EVENT_ID: eventId, ORGANIZATION: gTenantId }
  const apiOptions = createSwaggerOptions({ body: eventBody })

  return expect(() => standardTest({
    fullyQualifiedApiName: 'messaging.sendTransactionalEvent',
    apiParameters,
    apiOptions,
    sdkArgs,
    ErrorClass: codes.ERROR_SEND_TRANSACTIONAL_EVENT
  })).not.toThrow()
})

test('getTransactionalEvent', async () => {
  const eventId = 'foo-bar-321'
  const eventPKey = '@agsagasgasgasgasg313'

  const sdkArgs = [eventId, eventPKey]
  const apiParameters = { EVENT_ID: eventId, ORGANIZATION: gTenantId, EVENT_PKEY: eventPKey }
  const apiOptions = createSwaggerOptions({ body: null })

  return expect(() => standardTest({
    fullyQualifiedApiName: 'messaging.getTransactionalEvent',
    apiParameters,
    apiOptions,
    sdkArgs,
    ErrorClass: codes.ERROR_GET_TRANSACTIONAL_EVENT
  })).not.toThrow()
})

test('getWorkflow', async () => {
  const workflowId = 'wfoo-bar-321'

  const sdkArgs = [workflowId]
  const apiParameters = { WORKFLOW_ID: workflowId }
  const apiOptions = createSwaggerOptions({ body: null })

  return expect(() => standardTest({
    fullyQualifiedApiName: 'workflow.getWorkflow',
    apiParameters,
    apiOptions,
    sdkArgs,
    ErrorClass: codes.ERROR_GET_WORKFLOW
  })).not.toThrow()
})

test('triggerSignalActivity - success', async () => {
  const workflowTriggerUrl = 'https://fake.site/'
  const workflowParameters = {
    'source:': 'API',
    parameters: {
      audience: 'audience',
      email: 'anna.anna@gibberishxyz.com',
      template: '05',
      contentURL: 'http://www.adobe.com',
      test: 'true',
      segmentCode: 'my segment',
      attribute: '2019-04-03 08:17:19.100Z'
    }
  }

  const expectedResult = { data: '12345' }
  fetchMock.mockResponseOnce(JSON.stringify(expectedResult), {
    headers: { 'content-type': 'application/json' }
  })

  // this API function does not go through Swagger Client at all,
  // and goes through node-fetch
  const client = await createSdkClient()
  const triggerSuccess = client.triggerSignalActivity(workflowTriggerUrl, workflowParameters)

  expect(fetchMock.mock.calls.length).toEqual(1)
  // [0][0] -> [call-index][argument-index], so first call's first argument
  const requestObject = fetchMock.mock.calls[0][0]
  const requestInternalsSymbol = Object.getOwnPropertySymbols(requestObject).find(item => String(item) === 'Symbol(Request internals)')

  expect(requestObject[requestInternalsSymbol].parsedURL.href).toEqual(workflowTriggerUrl)
  return expect(triggerSuccess).resolves.toEqual(expectedResult)
})

test('triggerSignalActivity - success (call within restricted period)', async () => {
  const workflowTriggerUrl = 'https://fake.site/'
  const workflowParameters = {
    'source:': 'API',
    parameters: {
      audience: 'audience',
      email: 'anna.anna@gibberishxyz.com',
      template: '05',
      contentURL: 'http://www.adobe.com',
      test: 'true',
      segmentCode: 'my segment',
      attribute: '2019-04-03 08:17:19.100Z'
    }
  }

  const expectedResult = 'this is a call within restricted period'
  fetchMock.mockResponseOnce(expectedResult, {
    headers: { 'content-type': 'text/plain' },
    body: expectedResult
  })

  // this API function does not go through Swagger Client at all,
  // and goes through node-fetch
  const client = await createSdkClient()
  const triggerSuccess = client.triggerSignalActivity(workflowTriggerUrl, workflowParameters)

  expect(fetchMock.mock.calls.length).toEqual(1)
  // [0][0] -> [call-index][argument-index], so first call's first argument
  const requestObject = fetchMock.mock.calls[0][0]
  const requestInternalsSymbol = Object.getOwnPropertySymbols(requestObject).find(item => String(item) === 'Symbol(Request internals)')

  expect(requestObject[requestInternalsSymbol].parsedURL.href).toEqual(workflowTriggerUrl)
  return expect(triggerSuccess).resolves.toEqual({ payload: expectedResult })
})

test('triggerSignalActivity - error', async () => {
  const workflowTriggerUrl = 'https://fake.site/'
  const workflowParameters = {
    'source:': 'API',
    parameters: {
      audience: 'audience',
      email: 'anna.anna@gibberishxyz.com',
      template: '05',
      contentURL: 'http://www.adobe.com',
      test: 'true',
      segmentCode: 'my segment',
      attribute: '2019-04-03 08:17:19.100Z'
    }
  }

  const expectedError = new Error('Foo')
  fetchMock.mockRejectOnce(expectedError)

  // this API function does not go through Swagger Client at all,
  // and goes through node-fetch
  const client = await createSdkClient()

  const triggerFail = client.triggerSignalActivity(workflowTriggerUrl, workflowParameters)
  const sdkDetails = { workflowTriggerUrl, workflowParameters }

  expect(fetchMock.mock.calls.length).toEqual(1)
  // [0][0] -> [call-index][argument-index], so first call's first argument
  const requestObject = fetchMock.mock.calls[0][0]
  const requestInternalsSymbol = Object.getOwnPropertySymbols(requestObject).find(item => String(item) === 'Symbol(Request internals)')

  expect(requestObject[requestInternalsSymbol].parsedURL.href).toEqual(workflowTriggerUrl)
  return expect(triggerFail).rejects.toEqual(new codes.ERROR_TRIGGER_SIGNAL_ACTIVITY({ sdkDetails, messageValues: expectedError }))
})

test('controlWorkflow', async () => {
  const workflowId = 'wfoo-bar-321'
  const command = 'START'

  const sdkArgs = [workflowId, command]
  const apiParameters = { WORKFLOW_ID: workflowId }
  const apiOptions = createSwaggerOptions({
    body: {
      method: command.toLowerCase()
    }
  })

  return expect(() => standardTest({
    fullyQualifiedApiName: 'workflow.controlWorkflow',
    apiParameters,
    apiOptions,
    sdkArgs,
    ErrorClass: codes.ERROR_CONTROL_WORKFLOW
  })).not.toThrow()
})

test('controlWorkflow - invalid resource', async () => {
  const workflowId = 'wfoo-bar-321'
  const command = 'gibberish'
  const sdkClient = await createSdkClient()
  const sdkDetails = { workflowId, command }

  return expect(sdkClient.controlWorkflow(workflowId, command)).rejects.toEqual(
    new codes.ERROR_INVALID_WORKFLOW_CONTROL_COMMAND({ sdkDetails, messageValues: 'start, pause, resume, stop' })
  )
})

test('getAllOrgUnits', async () => {
  const sdkArgs = []
  const apiParameters = { EXT: '', FILTERS: [], freeForm: {} } // equiv to default
  const apiOptions = createSwaggerOptions({ body: null })

  return expect(() => standardTest({
    fullyQualifiedApiName: 'organization.getAllOrgUnits',
    apiParameters,
    apiOptions,
    sdkArgs,
    ErrorClass: codes.ERROR_GET_ALL_ORG_UNITS
  })).not.toThrow()
})

test('getProfileWithOrgUnit', async () => {
  const pkey = '@agsagasgasgasgasg313'

  const sdkArgs = [pkey]
  const apiParameters = { PROFILE_PKEY: pkey }
  const apiOptions = createSwaggerOptions({ body: null })

  return expect(() => standardTest({
    fullyQualifiedApiName: 'organization.getProfileWithOrgUnit',
    apiParameters,
    apiOptions,
    sdkArgs,
    ErrorClass: codes.ERROR_GET_PROFILE_WITH_ORG_UNIT
  })).not.toThrow()
})

test('updateProfileOrgUnit', async () => {
  const profilePKey = 'pfoo-bar-321'
  const orgUnitPKey = 'ogfoo-bar-321'

  const sdkArgs = [profilePKey, orgUnitPKey]
  const apiParameters = { PROFILE_PKEY: profilePKey }
  const apiOptions = createSwaggerOptions({
    body: {
      orgUnit: {
        PKey: orgUnitPKey
      }
    }
  })

  return expect(() => standardTest({
    fullyQualifiedApiName: 'organization.updateProfileOrgUnit',
    apiParameters,
    apiOptions,
    sdkArgs,
    ErrorClass: codes.ERROR_UPDATE_PROFILE_ORG_UNIT
  })).not.toThrow()
})

test('updateOrgUnit', async () => {
  const pkey = '@agsagasgasgasgasg313'
  const orgUnitObject = {
    desc: 'this is the org description',
    label: 'this is the org label'
  }

  const sdkArgs = [pkey, orgUnitObject]
  const apiParameters = { ORGUNIT_PKEY: pkey }
  const apiOptions = createSwaggerOptions({ body: orgUnitObject })

  return expect(() => standardTest({
    fullyQualifiedApiName: 'organization.updateOrgUnit',
    apiParameters,
    apiOptions,
    sdkArgs,
    ErrorClass: codes.ERROR_UPDATE_ORG_UNIT
  })).not.toThrow()
})

test('getDataFromRelativeUrl', async () => {
  const relativeUrl = '/profile/bla/blu/blee'

  const sdkArgs = [relativeUrl]
  const apiParameters = { RELATIVE_URL: relativeUrl }
  const apiOptions = createSwaggerOptions({ body: null })

  return expect(() => standardTest({
    fullyQualifiedApiName: 'util.getDataFromRelativeUrl',
    apiParameters,
    apiOptions,
    sdkArgs,
    ErrorClass: codes.ERROR_GET_DATA_FROM_RELATIVE_URL
  })).not.toThrow()
})

test('getAllCustomResources', async () => {
  const customResource = 'mycustomresource'

  const sdkArgs = [customResource]
  const apiParameters = { CUSTOMRESOURCE: customResource, EXT: '', FILTERS: [], freeForm: {} } // equiv to default
  const apiOptions = createSwaggerOptions({ body: null })

  return expect(() => standardTest({
    fullyQualifiedApiName: 'customresource.getAllCustomResources',
    apiParameters,
    apiOptions,
    sdkArgs,
    ErrorClass: codes.ERROR_GET_ALL_CUSTOM_RESOURCES
  })).not.toThrow()
})

test('getAllProfileAndServicesExt', async () => {
  const customResource = 'mycustomresource'

  const sdkArgs = [customResource]
  const apiParameters = { CUSTOMRESOURCE: customResource, EXT: '', FILTERS: [], freeForm: {} } // equiv to default
  const sdkFunctionName = 'getAllProfileAndServicesExt'
  const apiOptions = createSwaggerOptions({ body: null })
  return expect(() => standardTest({
    fullyQualifiedApiName: 'customresource.getAllCustomResources',
    apiParameters,
    apiOptions,
    sdkFunctionName,
    sdkArgs,
    ErrorClass: codes.ERROR_GET_ALL_PROFILES_AND_SERVICES_EXT
  })).not.toThrow()
})

test('getAllBasicCustomResources', async () => {
  const customResource = 'mycustomresource'

  const sdkArgs = [customResource]
  const apiParameters = { RESOURCE: customResource }
  const apiOptions = createSwaggerOptions({ body: null })

  return expect(() => standardTest({
    fullyQualifiedApiName: 'basiccustomresource.getAllBasicCustomResources',
    apiParameters,
    apiOptions,
    sdkArgs,
    ErrorClass: codes.ERROR_GET_ALL_BASIC_CUSTOM_RESOURCES
  })).not.toThrow()
})

test('getMetadataForResourceExt', async () => {
  const resource = 'mycustomresource'

  const sdkArgs = [resource]
  const apiParameters = { RESOURCE: resource }
  const apiOptions = createSwaggerOptions({ body: null })

  return expect(() => standardTest({
    fullyQualifiedApiName: 'metadataExt.getMetadataForResourceExt',
    apiParameters,
    apiOptions,
    sdkArgs,
    ErrorClass: codes.ERROR_GET_METADATA_FOR_RESOURCE_EXT
  })).not.toThrow()
})

test('createCustomResource', async () => {
  const customResourceObject = { firstName: 'Jack', lastName: 'Smith', email: 'foo@bar.com' }
  const customResource = 'mycustomresource'

  const sdkArgs = [customResource, customResourceObject]
  const apiParameters = { CUSTOMRESOURCE: customResource }
  const apiOptions = createSwaggerOptions({ body: customResourceObject })

  return expect(() => standardTest({
    fullyQualifiedApiName: 'customresource.createCustomResource',
    apiParameters,
    apiOptions,
    sdkArgs,
    ErrorClass: codes.ERROR_CREATE_CUSTOM_RESOURCE
  })).not.toThrow()
})

test('deleteCustomResource', async () => {
  const customResource = 'mycustomresource'
  const customResourcePKey = '12919119HH'

  const sdkArgs = [customResource, customResourcePKey]
  const apiParameters = { CUSTOMRESOURCE: customResource, PKEY: customResourcePKey }
  const apiOptions = createSwaggerOptions({})

  return expect(() => standardTest({
    fullyQualifiedApiName: 'customresource.deleteCustomResource',
    apiParameters,
    apiOptions,
    sdkArgs,
    ErrorClass: codes.ERROR_DELETE_CUSTOM_RESOURCE
  })).not.toThrow()
})

test('updateCustomResource', async () => {
  const customResource = 'mycustomresource'
  const customResourceObject = { foo: 'bar' }
  const customResourcePKey = '12919119HH'

  const sdkArgs = [customResource, customResourcePKey, customResourceObject]
  const apiParameters = { CUSTOMRESOURCE: customResource, PKEY: customResourcePKey }
  const apiOptions = createSwaggerOptions({ body: customResourceObject })

  return expect(() => standardTest({
    fullyQualifiedApiName: 'customresource.updateCustomResource',
    apiParameters,
    apiOptions,
    sdkArgs,
    ErrorClass: codes.ERROR_UPDATE_CUSTOM_RESOURCE
  })).not.toThrow()
})
