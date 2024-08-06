export default function manifestTemplate(appBundleId: string, appName: string, appVersion: string, ipaUrl: string) {
	return `
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>items</key>
	<array>
		<dict>
			<key>assets</key>
			<array>
				<dict>
					<key>kind</key>
					<string>software-package</string>
					<key>url</key>
					<string>${ipaUrl}</string>
				</dict>
			</array>
			<key>metadata</key>
			<dict>
				<key>bundle-identifier</key>
				<string>${appBundleId}</string>
				<key>bundle-version</key>
				<string>${appVersion}</string>
				<key>kind</key>
				<string>software</string>
				<key>title</key>
				<string>${appName}</string>
			</dict>
		</dict>
	</array>
</dict>
</plist>`;
}
