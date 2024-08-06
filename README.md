# iOS OTA Distribution Server

A simple OTA distribution server for iOS apps for Ad-Hoc distribution based on Cloudflare Workers.

## Features

**Simple**: Just hit up the upload API, upload your Ad-Hoc build, and get a link that will allow you to install the app on your device right away.

**Integrated**: This API can be directly integrated into your CI/CD pipeline to load your builds directly to your device for testing.

**Secure**: This API is built on Cloudflare and their serverless platform, meaning your builds are stored and served securely. You can spin up your instance of this API in minutes for free to control your builds fully.

## Using the API

### Uploading an IPA

To upload an IPA, you need to send a `POST` request to the `/ipa/create` endpoint with the following parameters:

- **`appName`** (**required**): The name of the app. This is the name that appears on the dialog when installing the app. To change the app's actual name, you must change the `CFBundleDisplayName` in the `Info.`plist` file during the build process.
- **bundleIdentifier** (**required**): The app's bundle identifier. This MUST match the `CFBundleIdentifier` in the `Info.plist` file during the build process. Otherwise, the app will not install.
- **`bundleVersion`** (**required**): The version of the app. Can be any semantic versioning string (Apple does not seem to enforce the bundle version in manifest files).
- **`file`** (**required**): The IPA file to upload.

Example Curl Request:

```bash
curl --location \
  --request POST 'https://backend-worker.sqz269.workers.dev/ipa/create' \
  --form 'file=@"tlmc_player_app.ipa"' \
  --data-urlencode 'bundleIdentifier=com.sqz269.tlmcPlayerApp' \
  --data-urlencode 'bundleVersion=1.0' \
  --data-urlencode 'appName=App'
```

To install the app on your device, open the link provided in the response on your iOS device. A dialog will appear asking if you want to install the app. Click "Install," and the app will be installed on your device.

### Troubleshooting

#### Unable To Install App, Please Try Again Later

If you see this message after installing the app on your device, there could be several reasons:

- The app bundle identifier provided to the API does not match the bundle identifier in the IPA file. You can unzip the IPA file and inspect the `Info.plist` file to verify the bundle identifier.
- Your device is not registered in the provisioning profile used to sign the app. Go to your Apple Developer account and make sure the device's UDID is added to the provisioning profile used to sign the app. Once you've added the device, you need to re-sign the app with the updated provisioning profile and upload it to the API.

#### Developer Mode Required

If you see this message after installing the app on your device, you need to turn on developer mode for your device in the settings. Go to `Settings > Privacy & Security > Developer Mode` and turn on developer mode. Once you've turned on developer mode, you should be able to launch the app.

- If Developer Mode is not showing up under the Privacy & Security settings, try restarting your device or reinstalling the app.

## Spin up your own instance of the API

To spin up your own API instance, you need to have a Cloudflare account. Sign up for a free account at [Cloudflare](https://dash.cloudflare.com/sign-up).

### Pre-requisites

- Cloudflare Account
- Node.js
- Wrangler CLI

If you do not have any of the above, follow [this](https://blog.ericcfdemo.net/posts/installing-and-configuring-wrangler/) guide to set up your environment.

### Steps

1. Create a Cloudflare D1 Database with Wrangler CLI and note down the binding information (Command output)
	```bash
	npx wrangler d1 create ipa_metadata
	```

2. Create a R2 Storage Bucket
	1. Go to the Cloudflare Dashboard
	2. Click on **R2** on the Left Sidebar
	3. Click on **Create Bucket**
	3. Name your bucket (e.g. `ipa`) and click **Create Bucket**


3. Clone this repository
	```bash
	git clone https://github.com/sqz269/ios_ota_distributor
	```

4. Change directory to the cloned repository
	```bash
	cd ios_ota_distributor
	```

5. Install dependencies
	```bash
	npm install
	```

6. Open the `wrangler.toml` file and update the following fields:
	- Under `[[d1_databases]]`, update `database_name` with the database name from step 1 and `database_id` with the database id from step 1.

	- Under `[[r2_buckets]]`, update `bucket_name` with the bucket name you created in step 2.

7. Deploy the API
	```bash
	npx wrangler deploy
	```

8. Once the deployment is successful, you will see the API URL in the output. You can now use this URL to upload your IPA files.

## Integration with CI/CD

TODO

## API Endpoints

You can checkout the [API Documentation](Endpoints.md) for detailed API endpoints and usage examples.
