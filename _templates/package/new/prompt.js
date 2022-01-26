const { createPackagePrompt } = require('@aws-play/tool-hygen')

module.exports = createPackagePrompt({
  scope: '@prototype',
  license: 'Apache-2.0',
  prefix: false,
  defaults: {
    version: '0.0.0-alpha.0',
    homepage: 'https://github.com/aws-samples/aws-last-mile-delivery-hyperlocal',
    repository: 'https://github.com/aws-samples/aws-last-mile-delivery-hyperlocal',
    emailDomain: ''
  }
})
