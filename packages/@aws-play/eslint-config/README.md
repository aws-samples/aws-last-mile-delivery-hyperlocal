# `@aws-play/eslint-config`

> TODO: description

Eslint configuration

## Usage

Add the following to `.eslintrc.js` file in project depending on config.

### Recommended
Complete config for all languages and full setup (js, typescript, react, etc)
```
{
	extends: '@aws-play/eslint-config/recommended',
	...
}
```

### Standard
Add basic config for javascript and standard languages
```
{
	extends: '@aws-play/eslint-config/standard',
	...
}
```

### Typescript
Add typescript support (includes `standard` as well)
```
{
	extends: '@aws-play/eslint-config/typescript',
	...
}
```
