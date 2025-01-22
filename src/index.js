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
/**
 * Adobe Campaign Standard Core SDK
 */

'use strict'

const Swagger = require('swagger-client')
const loggerNamespace = 'aio-lib-campaign-standard'
const logger = require('@adobe/aio-lib-core-logging')(loggerNamespace, { level: process.env.LOG_LEVEL })
const { reduceError, requestInterceptor, responseInterceptor, createRequestOptions } = require('./helpers')
const { codes } = require('./SDKErrors')
const { createFetch } = require('@adobe/aio-lib-core-networking')

/**
 * Returns a Promise that resolves with a new CampaignStandardCoreAPI object.
 *
 * @param {string} tenantId the tenant id (your personal organization in Campaign Standard)
 * @param {string} apiKey the API key for your Adobe I/O Campaign Standard Integration
 * @param {string} accessToken the access token for your Adobe I/O Campaign Standard Integration
 * @returns {Promise<CampaignStandardCoreAPI>} returns the initialized CampaignStandardCoreAPI object
 */
function init (tenantId, apiKey, accessToken) {
  return new Promise((resolve, reject) => {
    const clientWrapper = new CampaignStandardCoreAPI()

    clientWrapper.init(tenantId, apiKey, accessToken)
      .then(initializedSDK => {
        logger.debug('sdk initialized successfully')
        resolve(initializedSDK)
      })
      .catch(err => {
        logger.debug(`sdk init error: ${err}`)
        reject(err)
      })
  })
}

/**
 * This class provides methods to call Adobe Campaign Standard APIs.
 * Before calling any method initialize the instance by calling the `init` method on it
 * with valid values for tenantId, apiKey and accessToken
 */
class CampaignStandardCoreAPI {
  /**
   * Initializes this object.
   *
   * @param {string} tenantId the tenant id (your personal organization in Campaign Standard)
   * @param {string} apiKey the API key for your Adobe I/O Campaign Standard Integration
   * @param {string} accessToken the access token for your Adobe I/O Campaign Standard Integration
   * @returns {CampaignStandardCoreAPI} returns the initialized CampaignStandardCoreAPI object
   */
  async init (tenantId, apiKey, accessToken) {
    // init swagger client
    const spec = require('../spec/api.json')
    const swagger = new Swagger({
      spec,
      requestInterceptor,
      responseInterceptor,
      usePromise: true,
      userFetch: createFetch()
    })
    this.sdk = (await swagger)

    const initErrors = []
    if (!tenantId) {
      initErrors.push('tenantId')
    }
    if (!apiKey) {
      initErrors.push('apiKey')
    }
    if (!accessToken) {
      initErrors.push('accessToken')
    }

    if (initErrors.length) {
      const sdkDetails = { tenantId, apiKey, accessToken }
      throw new codes.ERROR_SDK_INITIALIZATION({ sdkDetails, messageValues: `${initErrors.join(', ')}` })
    }

    /** the tenant id (your personal organization in Campaign Standard) */
    this.tenantId = tenantId
    /** the api key from your Adobe I/O Campaign Standard integration */
    this.apiKey = apiKey
    /** the access token from your Adobe I/O Campaign Standard integration */
    this.accessToken = accessToken
    return this
  }

  __createRequestOptions ({ body } = {}) {
    return createRequestOptions({
      tenantId: this.tenantId,
      apiKey: this.apiKey,
      accessToken: this.accessToken,
      body
    })
  }

  __createFilterParams (params = {}) {
    const { filters, hasCustomFilter, lineCount, order, descendingSort } = params
    const fixedParams = ['filters', 'hasCustomFilter', 'lineCount', 'order', 'descendingSort']

    const retParams = {
      EXT: '',
      FILTERS: []
    }

    // filter for extra keys, set these to the 'freeForm' property (for free-form query parameters)
    retParams.freeForm = Object.keys(params)
      .filter(key => !fixedParams.includes(key))
      .reduce((o, key) => {
        o[key] = params[key]
        return o
      }, {})

    if (filters) {
      // this is a fixed path param
      retParams.FILTERS = filters.join('/')
    }

    if (hasCustomFilter) {
      // this is modifies the url (append to resource)
      retParams.EXT = 'Ext'
    }

    // this is a fixed query param
    if (lineCount) { // lineCount default is 25
      retParams._lineCount = lineCount
    }

    if (order) {
      // this is a fixed query param
      retParams._order = order
      if (descendingSort) { // ascending is the default
        retParams._order += '%20desc'
      }
    }

    return retParams
  }

  /**
   * Get all Profile records
   *
   * @param {object} [parameters={}] parameters to pass
   * @param {Array} [parameters.filters=[]] apply the filters to the results. List of filters for a resource can be retrieved via a getMetadataForResource call
   * @param {boolean} [parameters.hasCustomFilter=false] set to true if you have a custom filter. Defaults to false.
   * @param {number} [parameters.lineCount=25] limit the number of records to return (default is 25)
   * @param {string} [parameters.order] the field to order your records by (see the fields of a {@link https://docs.campaign.adobe.com/doc/standard/en/api/ACS_API.html#profile|Profile})
   * @param {boolean} [parameters.descendingSort=false] set to true to get results in descending order (default is ascending)
   * @see getMetadataForResource
   */
  getAllProfiles (parameters) {
    const sdkDetails = { parameters }

    return new Promise((resolve, reject) => {
      this.sdk.apis.profile.getAllProfiles(this.__createFilterParams(parameters), this.__createRequestOptions({ body: null }))
        .then(response => {
          resolve(response)
        })
        .catch(err => {
          reject(new codes.ERROR_GET_ALL_PROFILES({ sdkDetails, messageValues: reduceError(err) }))
        })
    })
  }

  /**
   * Create a Profile record
   *
   * @param {object} profileObject see {@link https://docs.campaign.adobe.com/doc/standard/en/api/ACS_API.html#profile|profile properties}
   */
  createProfile (profileObject) {
    const sdkDetails = { profileObject }

    return new Promise((resolve, reject) => {
      this.sdk.apis.profile.createProfile(this.__createFilterParams({}), this.__createRequestOptions({ body: profileObject }))
        .then(response => {
          resolve(response)
        })
        .catch(err => {
          reject(new codes.ERROR_CREATE_PROFILE({ sdkDetails, messageValues: reduceError(err) }))
        })
    })
  }

  /**
   * Update a Profile record
   *
   * @param {string} profilePKey the PKey property of a Profile record
   * @param {object} profileObject see {@link https://docs.campaign.adobe.com/doc/standard/en/api/ACS_API.html#profile|profile properties}. Only set the properties you want to update.
   */
  updateProfile (profilePKey, profileObject) {
    const sdkDetails = { profileObject, profilePKey }

    return new Promise((resolve, reject) => {
      this.sdk.apis.profile.updateProfile({ PROFILE_PKEY: profilePKey }, this.__createRequestOptions({ body: profileObject }))
        .then(response => {
          resolve(response)
        })
        .catch(err => {
          reject(new codes.ERROR_UPDATE_PROFILE({ sdkDetails, messageValues: reduceError(err) }))
        })
    })
  }

  /**
   * Get a Profile record
   *
   * @param {string} profilePKey the PKey property of a Profile record
   */
  getProfile (profilePKey) {
    const sdkDetails = { profilePKey }

    return new Promise((resolve, reject) => {
      this.sdk.apis.profile.getProfile({ PROFILE_PKEY: profilePKey }, this.__createRequestOptions({ body: null }))
        .then(response => {
          resolve(response)
        })
        .catch(err => {
          reject(new codes.ERROR_GET_PROFILE({ sdkDetails, messageValues: reduceError(err) }))
        })
    })
  }

  /**
   * Get all Service records
   *
   * @param {object} [parameters={}] parameters to pass
   * @param {Array} [parameters.filters=[]] apply the filters to the results. List of filters for a resource can be retrieved via a getMetadataForResource call
   * @param {boolean} [parameters.hasCustomFilter=false] set to true if you have a custom filter. Defaults to false.
   * @param {number} [parameters.lineCount=25] limit the number of records to return (default is 25)
   * @param {string} [parameters.order] the field to order your records by (see the fields of a {@link https://docs.campaign.adobe.com/doc/standard/en/api/ACS_API.html#service|Service})
   * @param {boolean} [parameters.descendingSort=false] set to true to get results in descending order (default is ascending)
   * @see getMetadataForResource
   */
  getAllServices (parameters) {
    const sdkDetails = { parameters }

    return new Promise((resolve, reject) => {
      this.sdk.apis.service.getAllServices(this.__createFilterParams(parameters), this.__createRequestOptions({ body: null }))
        .then(response => {
          resolve(response)
        })
        .catch(err => {
          reject(new codes.ERROR_GET_ALL_SERVICES({ sdkDetails, messageValues: reduceError(err) }))
        })
    })
  }

  /**
   * Create a Service record
   *
   * @param {object} serviceObject see {@link https://docs.campaign.adobe.com/doc/standard/en/api/ACS_API.html#service|service properties}
   */
  createService (serviceObject) {
    const sdkDetails = { serviceObject }

    return new Promise((resolve, reject) => {
      this.sdk.apis.service.createService(this.__createFilterParams({}), this.__createRequestOptions({ body: serviceObject }))
        .then(response => {
          resolve(response)
        })
        .catch(err => {
          reject(new codes.ERROR_CREATE_SERVICE({ sdkDetails, messageValues: reduceError(err) }))
        })
    })
  }

  /**
   * Get a Service record
   *
   * @param {string} servicePKey the PKey property of a Service record
   */
  getService (servicePKey) {
    const sdkDetails = { servicePKey }

    return new Promise((resolve, reject) => {
      this.sdk.apis.service.getService({ SERVICE_PKEY: servicePKey }, this.__createRequestOptions({ body: null }))
        .then(response => {
          resolve(response)
        })
        .catch(err => {
          reject(new codes.ERROR_GET_SERVICE({ sdkDetails, messageValues: reduceError(err) }))
        })
    })
  }

  /**
   * Get the marketing history of a Profile
   *
   * @param {string} profilePKey the PKey property of a Profile record
   */
  getHistoryOfProfile (profilePKey) {
    const sdkDetails = { profilePKey }

    return new Promise((resolve, reject) => {
      this.sdk.apis.history.getHistoryOfProfile({ PROFILE_PKEY: profilePKey }, this.__createRequestOptions({ body: null }))
        .then(response => {
          resolve(response)
        })
        .catch(err => {
          reject(new codes.ERROR_GET_HISTORY_OF_PROFILE({ sdkDetails, messageValues: reduceError(err) }))
        })
    })
  }

  /**
   * Get the metadata information for a resource.
   *
   * @param {string} resource one of profile, service, history
   */
  getMetadataForResource (resource) {
    const sdkDetails = { resource }

    return new Promise((resolve, reject) => {
      const acceptedResources = ['profile', 'service', 'history']
      if (!acceptedResources.includes(resource.toLowerCase())) {
        reject(new codes.ERROR_INVALID_RESOURCE_TYPE({ sdkDetails, messageValues: `${acceptedResources.join(', ')}` }))
      }

      this.sdk.apis.metadata.getMetadataForResource({ RESOURCE: resource }, this.__createRequestOptions({ body: null }))
        .then(response => {
          resolve(response)
        })
        .catch(err => {
          reject(new codes.ERROR_GET_METADATA_FOR_RESOURCE({ sdkDetails, messageValues: reduceError(err) }))
        })
    })
  }

  /**
   * Retrieve custom resource linked to the Profile table
   *
   * @param {string} resource any custom resource
   */
  getMetadataForResourceExt (resource) {
    const sdkDetails = { resource }

    return new Promise((resolve, reject) => {
      this.sdk.apis.metadataExt.getMetadataForResourceExt({ RESOURCE: resource }, this.__createRequestOptions({ body: null }))
        .then(response => {
          resolve(response)
        })
        .catch(err => {
          reject(new codes.ERROR_GET_METADATA_FOR_RESOURCE_EXT({ sdkDetails, messageValues: reduceError(err) }))
        })
    })
  }

  /**
   * Get all the custom resource collections linked to the Profile table.
   */
  getCustomResources () {
    return new Promise((resolve, reject) => {
      this.sdk.apis.metadata.getCustomResources({}, this.__createRequestOptions({ body: null }))
        .then(response => {
          resolve(response)
        })
        .catch(err => {
          reject(new codes.ERROR_GET_CUSTOM_RESOURCES({ messageValues: reduceError(err) }))
        })
    })
  }

  /**
   * Create a new GDPR request.
   *
   * @param {object} gdprRequest see {@link https://docs.campaign.adobe.com/doc/standard/en/api/ACS_API.html#create-a-new-gdpr-request|the properties} that are needed.
   */
  createGDPRRequest (gdprRequest) {
    const sdkDetails = { gdprRequest }

    return new Promise((resolve, reject) => {
      this.sdk.apis.gdpr.createGDPRRequest({}, this.__createRequestOptions({ body: gdprRequest }))
        .then(response => {
          resolve(response)
        })
        .catch(err => {
          reject(new codes.ERROR_CREATE_GDPR_REQUEST({ sdkDetails, messageValues: reduceError(err) }))
        })
    })
  }

  /**
   * Get data about the current GDPR request.
   */
  getGDPRRequest () {
    return new Promise((resolve, reject) => {
      this.sdk.apis.gdpr.getGDPRRequest({}, this.__createRequestOptions({ body: null }))
        .then(response => {
          resolve(response)
        })
        .catch(err => {
          reject(new codes.ERROR_GET_GDPR_REQUEST({ messageValues: reduceError(err) }))
        })
    })
  }

  /**
   * Get the GDPR data file.
   *
   * @param {string} privacyRequestDataUrl this is acquired from a getGDPRRequest call
   * @param {string} requestInternalName  the request internal name
   * @see getGDPRRequest
   */
  getGDPRDataFile (privacyRequestDataUrl, requestInternalName) {
    const sdkDetails = { privacyRequestDataUrl, requestInternalName }

    return new Promise((resolve, reject) => {
      this.postDataToUrl(privacyRequestDataUrl, { name: requestInternalName })
        .then(res => responseInterceptor(res).json())
        .then(json => resolve(json))
        .catch(err => reject(new codes.ERROR_GET_GDPR_DATA_FILE({ sdkDetails, messageValues: reduceError(err) })))
    })
  }

  /**
   * Send a transactional event.
   * Deprecated since 2.1.0. use sendTransactionalEventForMacTenantId instead.
   *
   * @deprecated
   * @param {string} eventId the type of event you want to send. This depends on the {@link https://docs.adobe.com/content/help/en/campaign-standard/using/administrating/configuring-channels/configuring-transactional-messaging.html|event definition}.
   * @param {object} eventBody the event data to send. This depends on the {@link https://docs.adobe.com/content/help/en/campaign-standard/using/administrating/configuring-channels/configuring-transactional-messaging.html|event definition}.
   * @returns {Promise<object>} the response from the API
   */
  sendTransactionalEvent (eventId, eventBody) {
    return this.sendTransactionalEventForMacTenantId(this.tenantId, eventId, eventBody)
  }

  /**
   * Send a transactional event for a Marketing Cloud Tenant ID
   *
   * @param {string} macTenantId the Marketing Cloud Tenant ID
   * @param {string} eventId the type of event you want to send. This depends on the {@link https://docs.adobe.com/content/help/en/campaign-standard/using/administrating/configuring-channels/configuring-transactional-messaging.html|event definition}.
   * @param {object} eventBody the event data to send. This depends on the {@link https://docs.adobe.com/content/help/en/campaign-standard/using/administrating/configuring-channels/configuring-transactional-messaging.html|event definition}.
   * @returns {Promise<object>} the response from the API
   */
  sendTransactionalEventForMacTenantId (macTenantId, eventId, eventBody) {
    const sdkDetails = { macTenantId, eventId, eventBody }

    return new Promise((resolve, reject) => {
      this.sdk.apis.messaging.sendTransactionalEvent(
        {
          ORGANIZATION: macTenantId,
          EVENT_ID: eventId
        }, this.__createRequestOptions({ body: eventBody }))
        .then(response => {
          resolve(response)
        })
        .catch(err => {
          reject(new codes.ERROR_SEND_TRANSACTIONAL_EVENT({ sdkDetails, messageValues: reduceError(err) }))
        })
    })
  }

  /**
   * Gets data about a transactional event (status, properties)
   * Deprecated since 2.1.0. use getTransactionalEventForMacTenantId instead.
   *
   * @deprecated
   * @param {string} eventId the type of event you want to send
   * @param {string} eventPKey the PKey of an event (you get this from a sendTransactionalEvent call)
   * @see sendTransactionalEvent
   * @returns {Promise<object>} the response from the API
   */
  getTransactionalEvent (eventId, eventPKey) {
    return this.getTransactionalEventForMacTenantId(this.tenantId, eventId, eventPKey)
  }

  /**
   * Gets data about a transactional event for a Marketing Cloud Tenant ID (status, properties)
   *
   * @param {string} macTenantId the Marketing Cloud Tenant ID
   * @param {string} eventId the type of event you want to send
   * @param {string} eventPKey the PKey of an event (you get this from a sendTransactionalEvent call)
   * @see sendTransactionalEvent
   * @returns {Promise<object>} the response from the API
   */
  getTransactionalEventForMacTenantId (macTenantId, eventId, eventPKey) {
    const sdkDetails = { macTenantId, eventId, eventPKey }

    return new Promise((resolve, reject) => {
      this.sdk.apis.messaging.getTransactionalEvent(
        {
          ORGANIZATION: macTenantId,
          EVENT_ID: eventId,
          EVENT_PKEY: eventPKey
        }, this.__createRequestOptions({ body: null }))
        .then(response => {
          resolve(response)
        })
        .catch(err => {
          reject(new codes.ERROR_GET_TRANSACTIONAL_EVENT({ sdkDetails, messageValues: reduceError(err) }))
        })
    })
  }

  /**
   * Gets the properties of a workflow.
   *
   * @param {string} workflowId the id of the workflow
   */
  getWorkflow (workflowId) {
    const sdkDetails = { workflowId }

    return new Promise((resolve, reject) => {
      this.sdk.apis.workflow.getWorkflow({ WORKFLOW_ID: workflowId }, this.__createRequestOptions({ body: null }))
        .then(response => {
          resolve(response)
        })
        .catch(err => {
          reject(new codes.ERROR_GET_WORKFLOW({ sdkDetails, messageValues: reduceError(err) }))
        })
    })
  }

  /**
   * Trigger a workflow.
   *
   * @param {string} workflowTriggerUrl the trigger url for a workflow. You can get this from a call to getWorkflow
   * @param {object} [workflowParameters] workflow parameters object. see the payload in the {@link https://docs.campaign.adobe.com/doc/standard/en/api/ACS_API.html#triggering-a-signal-activity|docs}
   * @param {string} workflowParameters.source the triggering request source
   * @param {object} workflowParameters.parameters the parameters to send to the workflow (paramater name, and parameter value pairs)
   * @see getWorkflow
   */
  triggerSignalActivity (workflowTriggerUrl, workflowParameters) {
    const sdkDetails = { workflowTriggerUrl, workflowParameters }

    return new Promise((resolve, reject) => {
      this.postDataToUrl(workflowTriggerUrl, workflowParameters)
        .then(res => {
          const ri = responseInterceptor(res)
          const contentType = ri.headers.get('content-type')
          if (contentType && contentType.includes('application/json')) {
            return ri.json()
          } else {
            // external Signal activities in ACS can only be called once every 10 minutes.
            // This is a hardcoded restriction to prevent serious issues in the workflows.
            // Handle the response during this 10 minute period -- response is not json,
            // we just grab the text data and put it in a json object
            return ri.text()
              .then(
                text => ({ payload: text })
              )
          }
        })
        .then(json => resolve(json))
        .catch(err => reject(new codes.ERROR_TRIGGER_SIGNAL_ACTIVITY({ sdkDetails, messageValues: reduceError(err) })))
    })
  }

  /**
   * Controls execution of a workflow.
   *
   * @param {string} workflowId the id of the workflow
   * @param {string} command the command to execute for the workflow. one of start, pause, resume, stop
   */
  controlWorkflow (workflowId, command) {
    const sdkDetails = { workflowId, command }

    return new Promise((resolve, reject) => {
      const acceptedCommands = ['start', 'pause', 'resume', 'stop']
      if (!acceptedCommands.includes(command.toLowerCase())) {
        reject(new codes.ERROR_INVALID_WORKFLOW_CONTROL_COMMAND({ sdkDetails, messageValues: `${acceptedCommands.join(', ')}` }))
      }

      this.sdk.apis.workflow.controlWorkflow({ WORKFLOW_ID: workflowId },
        this.__createRequestOptions({
          body: {
            method: command.toLowerCase()
          }
        }))
        .then(response => {
          resolve(response)
        })
        .catch(err => {
          reject(new codes.ERROR_CONTROL_WORKFLOW({ sdkDetails, messageValues: reduceError(err) }))
        })
    })
  }

  /**
   * Get all available orgUnits
   *
   * @param {object} [parameters={}] parameters to pass
   * @param {Array} [parameters.filters=[]] apply the filters to the results. List of filters for a resource can be retrieved via a getMetadataForResource call
   * @param {number} [parameters.lineCount=25] limit the number of records to return (default is 25)
   * @param {string} [parameters.order] the field to order your records by (see the fields of a {@link https://docs.campaign.adobe.com/doc/standard/en/api/ACS_API.html#orgunitbase|OrgUnitBase})
   * @param {boolean} [parameters.descendingSort=false] set to true to get results in descending order (default is ascending)
   * @returns {Promise<object>} the response from the API
   * @see getMetadataForResource
   */
  getAllOrgUnits (parameters) {
    const sdkDetails = { parameters }

    return new Promise((resolve, reject) => {
      this.sdk.apis.organization.getAllOrgUnits(this.__createFilterParams(parameters), this.__createRequestOptions({ body: null }))
        .then(response => {
          resolve(response)
        })
        .catch(err => {
          reject(new codes.ERROR_GET_ALL_ORG_UNITS({ sdkDetails, messageValues: reduceError(err) }))
        })
    })
  }

  /**
   * Gets a Profile record (with it's orgUnit property)
   *
   * @param {string} profilePKey the PKey property of a Profile record
   */
  getProfileWithOrgUnit (profilePKey) {
    const sdkDetails = { profilePKey }

    return new Promise((resolve, reject) => {
      this.sdk.apis.organization.getProfileWithOrgUnit({ PROFILE_PKEY: profilePKey }, this.__createRequestOptions({ body: null }))
        .then(response => {
          resolve(response)
        })
        .catch(err => {
          reject(new codes.ERROR_GET_PROFILE_WITH_ORG_UNIT({ sdkDetails, messageValues: reduceError(err) }))
        })
    })
  }

  /**
   * Update the orgUnit of a Profile
   *
   * @param {string} profilePKey the PKey property of a Profile record
   * @param {string} orgUnitPKey the PKey property of a OrgUnitBase record
   */
  updateProfileOrgUnit (profilePKey, orgUnitPKey) {
    const sdkDetails = { profilePKey, orgUnitPKey }

    return new Promise((resolve, reject) => {
      this.sdk.apis.organization.updateProfileOrgUnit({ PROFILE_PKEY: profilePKey },
        this.__createRequestOptions({
          body: {
            orgUnit: {
              PKey: orgUnitPKey
            }
          }
        }))
        .then(response => {
          resolve(response)
        })
        .catch(err => {
          reject(new codes.ERROR_UPDATE_PROFILE_ORG_UNIT({ sdkDetails, messageValues: reduceError(err) }))
        })
    })
  }

  /**
   * Update the properties of an OrgUnitBase.
   *
   * @param {string} orgUnitPKey the PKey property of a OrgUnitBase record
   * @param {object} orgUnitObject see {@link https://docs.campaign.adobe.com/doc/standard/en/api/ACS_API.html#orgunitbase|orgUnitBase properties}. Only set the properties you want to update.
   */
  updateOrgUnit (orgUnitPKey, orgUnitObject) {
    const sdkDetails = { orgUnitPKey, orgUnitObject }

    return new Promise((resolve, reject) => {
      this.sdk.apis.organization.updateOrgUnit({ ORGUNIT_PKEY: orgUnitPKey },
        this.__createRequestOptions({ body: orgUnitObject }))
        .then(response => {
          resolve(response)
        })
        .catch(err => {
          reject(new codes.ERROR_UPDATE_ORG_UNIT({ sdkDetails, messageValues: reduceError(err) }))
        })
    })
  }

  /**
   * Post to an absolute url.
   *
   * @param {string} url the url to POST to
   * @param {object} body the POST body
   * @returns {Promise<object>} the response from the API
   */
  postDataToUrl (url, body) {
    const options = this.__createRequestOptions()
    const fetch = createFetch()
    const request = new fetch.Request(url, {
      method: 'post',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json;charset=utf-8',
        'Cache-Control': 'no-cache',
        Authorization: `Bearer ${options.securities.authorized.BearerAuth.value}`,
        'X-Api-Key': options.securities.authorized.ApiKeyAuth.value
      }
    })

    return fetch(requestInterceptor(request))
  }

  /**
   * Gets data from a relative url. Helper function.
   *
   * @param {string} relativeUrl the relative url (returned from some ACS API calls)
   */
  getDataFromRelativeUrl (relativeUrl) {
    const sdkDetails = { relativeUrl }

    return new Promise((resolve, reject) => {
      this.sdk.apis.util.getDataFromRelativeUrl({ RELATIVE_URL: relativeUrl }, this.__createRequestOptions({ body: null }))
        .then(response => {
          resolve(response)
        })
        .catch(err => {
          reject(new codes.ERROR_GET_DATA_FROM_RELATIVE_URL({ sdkDetails, messageValues: reduceError(err) }))
        })
    })
  }

  /**
   * Get all Custom Resource records
   * Either use getAllBasicCustomResources() to get custom resources or
   * getAllProfileAndServicesExt() to get extended resource data
   * @deprecated
   * @param {string} customResource the custom resource to get records from
   * @param {object} [parameters={}] parameters to pass
   * @param {Array} [parameters.filters=[]] apply the filters to the results. List of filters for a resource can be retrieved via a getMetadataForResource call
   * @param {boolean} [parameters.hasCustomFilter=false] set to true if you have a custom filter. Defaults to false.
   * @param {number} [parameters.lineCount=25] limit the number of records to return (default is 25)
   * @param {string} [parameters.order] the field to order your records by (see the fields of a {@link https://docs.campaign.adobe.com/doc/standard/en/api/ACS_API.html#profile|Profile})
   * @param {boolean} [parameters.descendingSort=false] set to true to get results in descending order (default is ascending)
   * @see getMetadataForResource
   */
  getAllCustomResources (customResource, parameters) {
    const sdkDetails = { customResource, parameters }
    logger.warn('getAllCustomResources has been deprecated, either use getAllBasicCustomResources() to get custom resources or getAllProfileAndServicesExt() to get extended resource data')
    return new Promise((resolve, reject) => {
      const filterParams = { ...this.__createFilterParams(parameters), CUSTOMRESOURCE: customResource }
      this.sdk.apis.customresource.getAllCustomResources(filterParams, this.__createRequestOptions({ body: null }))
        .then(response => {
          resolve(response)
        })
        .catch(err => {
          reject(new codes.ERROR_GET_ALL_CUSTOM_RESOURCES({ sdkDetails, messageValues: reduceError(err) }))
        })
    })
  }

  /**
   * Get all Custom Resource records
   *
   * @param {string} resource one of profile, service, history
   */
  getAllBasicCustomResources (resource) {
    const sdkDetails = { resource }

    return new Promise((resolve, reject) => {
      this.sdk.apis.basiccustomresource.getAllBasicCustomResources({ RESOURCE: resource }, this.__createRequestOptions({ body: null }))
        .then(response => {
          resolve(response)
        })
        .catch(err => {
          reject(new codes.ERROR_GET_ALL_BASIC_CUSTOM_RESOURCES({ sdkDetails, messageValues: reduceError(err) }))
        })
    })
  }

  /**
   * Get all Custom Resource records
   *
   * @param {string} customResource the custom resource to get records from
   * @param {object} [parameters={}] parameters to pass
   * @param {Array} [parameters.filters=[]] apply the filters to the results. List of filters for a resource can be retrieved via a getMetadataForResource call
   * @param {boolean} [parameters.hasCustomFilter=false] set to true if you have a custom filter. Defaults to false.
   * @param {number} [parameters.lineCount=25] limit the number of records to return (default is 25)
   * @param {string} [parameters.order] the field to order your records by (see the fields of a {@link https://docs.campaign.adobe.com/doc/standard/en/api/ACS_API.html#profile|Profile})
   * @param {boolean} [parameters.descendingSort=false] set to true to get results in descending order (default is ascending)
   * @see getMetadataForResource
   */
  getAllProfileAndServicesExt (customResource, parameters) {
    const sdkDetails = { customResource, parameters }

    return new Promise((resolve, reject) => {
      const filterParams = { ...this.__createFilterParams(parameters), CUSTOMRESOURCE: customResource }
      this.sdk.apis.customresource.getAllCustomResources(filterParams, this.__createRequestOptions({ body: null }))
        .then(response => {
          resolve(response)
        })
        .catch(err => {
          reject(new codes.ERROR_GET_ALL_PROFILES_AND_SERVICES_EXT({ sdkDetails, messageValues: reduceError(err) }))
        })
    })
  }

  /**
   * Update a Custom Resource record
   *
   * @param {string} customResource the custom resource
   * @param {string} customResourcePKey the PKey property of a Custom Resource record
   * @param {object} customResourceObject A Custom Resource object. Only set the properties you want to update.
   */
  updateCustomResource (customResource, customResourcePKey, customResourceObject) {
    const sdkDetails = { customResource, customResourceObject, customResourcePKey }

    return new Promise((resolve, reject) => {
      this.sdk.apis.customresource.updateCustomResource({ CUSTOMRESOURCE: customResource, PKEY: customResourcePKey }, this.__createRequestOptions({ body: customResourceObject }))
        .then(response => {
          resolve(response)
        })
        .catch(err => {
          reject(new codes.ERROR_UPDATE_CUSTOM_RESOURCE({ sdkDetails, messageValues: reduceError(err) }))
        })
    })
  }

  /**
   * Create a Custom Resource record
   *
   * @param {string} customResource the custom resource
   * @param {object} customResourceObject a Custom Resource object
   */
  createCustomResource (customResource, customResourceObject) {
    const sdkDetails = { customResource, customResourceObject }

    return new Promise((resolve, reject) => {
      this.sdk.apis.customresource.createCustomResource({ CUSTOMRESOURCE: customResource }, this.__createRequestOptions({ body: customResourceObject }))
        .then(response => {
          resolve(response)
        })
        .catch(err => {
          reject(new codes.ERROR_CREATE_CUSTOM_RESOURCE({ sdkDetails, messageValues: reduceError(err) }))
        })
    })
  }

  /**
   * Delete a Custom Resource record
   *
   * @param {string} customResource the custom resource
   * @param {string} customResourcePKey the PKey property of a Custom Resource record
   */
  deleteCustomResource (customResource, customResourcePKey) {
    const sdkDetails = { customResource, customResourcePKey }

    return new Promise((resolve, reject) => {
      this.sdk.apis.customresource.deleteCustomResource({ CUSTOMRESOURCE: customResource, PKEY: customResourcePKey }, this.__createRequestOptions())
        .then(response => {
          resolve(response)
        })
        .catch(err => {
          reject(new codes.ERROR_DELETE_CUSTOM_RESOURCE({ sdkDetails, messageValues: reduceError(err) }))
        })
    })
  }
}
module.exports = {
  init
}
