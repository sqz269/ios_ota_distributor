# API Endpoint Documentation

## Endpoints

### **GET** `/`

#### Description

The index page of the API. Currently shows an informative message to indicate this is an API server and contains a link to this GitHub repository.

#### Parameters

None

#### Response

HTML Content

---

### **POST** `/ipa/create`

#### Description

Create a new IPA metadata entry and upload the IPA file for OTA distribution.

#### Parameters

##### Query Parameters

- **`appName`** (**required**): The name of the app. This is the name that appears on the dialog when installing the app. To change the actual name of the app, you need to change the `CFBundleDisplayName` in the `Info.plist` file during the build process.
- **`bundleIdentifier`** (**required**): The bundle identifier of the app. This MUST match the `CFBundleIdentifier` in the `Info.plist` file during the build process. Otherwise, the app will not install.
- **`bundleVersion`** (**required**): The version of the app. Can be any semantic versioning string (Apple does not seem to enforce the bundle version in manifest files).

##### Body

The body of the request MUST be a form-data request with the IPA file attached in the `file` field.

#### Request Example

```bash
curl --location \
  --request POST 'https://backend-worker.sqz269.workers.dev/ipa/create' \
  --form 'file=@"tlmc_player_app.ipa"' \
  --data-urlencode 'bundleIdentifier=com.sqz269.tlmcPlayerApp' \
  --data-urlencode 'bundleVersion=1.0' \
  --data-urlencode 'appName=App'
```

#### Response

```json
{
    "error": false,
    "id": "c057156c-116c-455a-95c8-c96248b9095f",
    "bundleIdentifier": "com.sqz269.tlmcPlayerApp",
    "bundleVersion": "1.0",
    "appName": "App",
    "uploadDate": 1722910948,
    "fileHash": "8b0ed651354540978554abb79dbe90db1f14d3e9733612c7126c7065625def0a",
    "directOtaUrl": "itms-services://?action=download-manifest&url=https://backend-worker.sqz269.workers.dev/ipa/c057156c-116c-455a-95c8-c96248b9095f/manifest",
    "interactiveOtaUrl": "https://backend-worker.sqz269.workers.dev/ipa/c057156c-116c-455a-95c8-c96248b9095f/ota"
}
```

- **`error`**: A boolean value indicating if the request was successful or not.
- **`id`**: The unique identifier of the IPA metadata entry. This id will be used to invoke other endpoints to retrieve the IPA file or the manifest file.
- **`bundleIdentifier`**: The bundle identifier of the app, as provided in the request.
- **`bundleVersion`**: The version of the app, as provided in the request.
- **`appName`**: The name of the app, as provided in the request.
- **`uploadDate`**: The timestamp of the upload date (Unix timestamp).
- **`fileHash`**: The SHA256 hash of the uploaded IPA file.
- **`directOtaUrl`**: The direct OTA URL to install the app on the device that directly prompts  the user to install the app.
- **`interactiveOtaUrl`**: The interactive OTA URL to install the app on the device when the user clicks on the link.

---

### **GET** `/ipa/:id/ota`

#### Description

Shows a simple HTML page with a link that, when clicked, opens the OTA installation dialog on the device.

#### Parameters

##### Path Parameters

- **`id`** (**required**): The unique identifier of the IPA metadata entry. This id is from the response of the /ipa/create endpoint.

#### Response

HTML Content, with a link to the OTA installation dialog.

---

### **GET** `/ipa/:id/manifest`

#### Description

Returns the manifest file for the OTA installation metadata. This manifest file is equivalent to the manifest.plist file that is used in the OTA installation process.

#### Parameters

##### Path Parameters

- **`id`** (**required**): The unique identifier of the IPA metadata entry. This id is from the response of the /ipa/create endpoint.

##### Response

XML Content, the manifest file.

---

### **GET** `/ipa/:id/download`

#### Description

Returns the actual IPA file to be downloaded.

#### Parameters

##### Path Parameters

- **`id`** (**required**): The unique identifier of the IPA metadata entry. This id is from the response of the /ipa/create endpoint.
Response
The IPA file to be downloaded, in a binary stream.
