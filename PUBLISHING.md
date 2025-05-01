# Publishing UploadIt to npm

This guide outlines the steps to publish the UploadIt package to npm.

## Preparation

1. Ensure all code is working correctly:

   - Run the build process: `npm run build`
   - Test the package in the example applications
   - Fix any issues found during testing

2. Update version in `package.json`:

   - For initial release: keep it at `0.1.0`
   - For subsequent releases: follow semantic versioning:
     - Patch (`0.1.1`): Bug fixes
     - Minor (`0.2.0`): New features, backward compatible
     - Major (`1.0.0`): Breaking changes

3. Update the README.md file:
   - Make sure all documentation is up-to-date
   - Check that examples and API references are correct

## Publishing

1. Login to npm (if not already logged in):

   ```bash
   npm login
   ```

2. Build the package:

   ```bash
   npm run build
   ```

3. Check what files will be included in the package:

   ```bash
   npm pack --dry-run
   ```

4. Publish to npm:

   ```bash
   npm publish
   ```

   If this is your first release and you want to make it public:

   ```bash
   npm publish --access public
   ```

## Post-Publishing

1. Create a git tag for the release:

   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```

2. Update the example projects to use the published version:
   - Change `"upload-it": "file:../../"` to `"upload-it": "^0.1.0"` in the example applications
   - Test that everything works with the published version

## Handling Scoped Packages

If you want to publish under a scope (e.g., `@your-name/upload-it`):

1. Update the name in `package.json`:

   ```json
   {
     "name": "@your-name/upload-it",
     ...
   }
   ```

2. Publish with the public access flag:
   ```bash
   npm publish --access public
   ```

## Updating the Package

For subsequent updates:

1. Make your code changes
2. Update the version in `package.json`
3. Run the build: `npm run build`
4. Publish: `npm publish`
5. Create and push a git tag

## Using a Custom Registry

If you're using a custom registry (like GitHub Packages):

1. Configure npm to use your registry for your scope:

   ```bash
   npm config set @your-name:registry https://npm.pkg.github.com
   ```

2. Update your package.json with the repository field:

   ```json
   {
     "name": "@your-name/upload-it",
     "repository": "github:your-name/upload-it",
     ...
   }
   ```

3. Publish to the custom registry:
   ```bash
   npm publish
   ```
