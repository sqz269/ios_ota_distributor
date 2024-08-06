export default function ipaOtaPage(appBundleIdentifier: string, appName: string, appVersion: string, fileHash: string, manifestUrl: string) {
	return `
	<!DOCTYPE html>
		<html>
		<head>
			<title>Install ${appName} (${appBundleIdentifier}) [${appVersion}]</title>
		</head>

		<body>
			<h1>
				<a href="itms-services://?action=download-manifest&url=${manifestUrl}">Install ${appName} (${appBundleIdentifier}) [${appVersion}]</a>
			</h1>
			<h3>Hash: ${fileHash}</h3>
		</body>
	</html>
`
}
