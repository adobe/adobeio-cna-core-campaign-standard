# Adobe I/O CNA Adobe Campaign Standard Core SDK
Javascript Core SDK wrapping [Adobe Campaign Standard APIs](https://docs.campaign.adobe.com/doc/standard/en/api/ACS_API.html#introduction).

- [JSDoc (HTML)](https://opensource.adobe.com/adobeio-cna-core-campaign-standard/index.html)
- [JSDoc (Markdown)](./docs/SDK.md)


### Installing

```bash
$ npm install
```

### Usage
```

var sdk = require('@adobe/adobeio-cna-core-campaign-standard');

// initialize sdk
const acsClient = await sdk.init('<tenant>', 'x-api-key', '<valid auth token>')

// call methods

// get profiles by custom filters
acsClient.getAllProfiles({
  filters: [
    'byLinkedin'
  ],
  hasCustomFilter: true
})

// get a workflow
acsClient.getWorkflow('myWkfId')
``` 

### Contributing

Contributions are welcome! Read the [Contributing Guide](./.github/CONTRIBUTING.md) for more information.

### Licensing

This project is licensed under the Apache V2 License. See [LICENSE](LICENSE) for more information.
