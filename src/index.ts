import { Router, RouterHandler } from '@tsndr/cloudflare-worker-router'
import { Validator } from '@cfworker/json-schema';
import { v4 as uuidv4 } from 'uuid'
import ipaOtaPage from './ipaOtaPage';
import manifestTemplate from './manifestTemplate';
import indexTemplate from './indexTemplate';

// Env Types
export type Var<T = string> = T
export type Secret<T = string> = T

export type Env = {
	// Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
	// MY_KV_NAMESPACE: KVNamespace
	//
	// Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
	// MY_DURABLE_OBJECT: DurableObjectNamespace
	//
	// Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
	IPA_STORE: R2Bucket
	//
	// Example Variable
	// ENVIRONMENT: Var<'dev' | 'prod'>
	//
	// Example Secret
	// JWT_SECRET: Secret

	// D1 Database
	IPA_METADATA_DB: D1Database
}

// Request Extension
export type ExtReq = {
	userId?: number
}

// Context Extension
export type ExtCtx = {
	//sentry?: Toucan
}

// Handler Type
export type Handler = RouterHandler<Env, ExtCtx, ExtReq>

// Initialize Router
const router = new Router<Env, ExtCtx, ExtReq>()

// Enable Debug Mode
router.debug()

// Enabling build in CORS support
router.cors()

router.get('/', async ({ env, req, ctx }) => {
	return new Response(indexTemplate(), {
		headers: {
			'Content-Type': 'text/html',
		}
	})
});

router.post('/ipa/create', async ({ env, req, ctx }) => {
	const validator = new Validator({
		type: 'object',
		required: ['bundleIdentifier', 'bundleVersion', 'appName'],
		properties: {
			bundleIdentifier: {
				type: 'string',
				minLength: 3,
				pattern: '^[a-zA-Z0-9]+(\\.[a-zA-Z0-9]+)+$'
			},
			bundleVersion: {
				type: 'string',
				minLength: 1,
				pattern: '^\\d+(\\.\\d+){0,2}$'
			},
			appName: {
				type: 'string',
				minLength: 1,
				maxLength: 90,
				pattern: '^[a-zA-Z0-9][a-zA-Z0-9 ._-]{0,89}$'
			}
		}
	}, undefined, false)

	// Validate the query
	const query = req.query as any
	const result = validator.validate(query)

	if (!result.valid) {
		return new Response(JSON.stringify({
			error: true,
			message: 'Invalid IPA metadata, check specified fields and make sure they adhere to Apple\'s CFBundleIdentifier, CFBundleVersion and CFBundleName requirements',
			details: result.errors,
		}), { status: 400 })
	}

	// Check if there is a file in the request
	const formData = await req.formData()
	const file = await formData.get('file')
	if (!file) {
		return new Response(JSON.stringify({
			error: true,
			message: 'No IPA file provided',
			details: "The 'file' field is required",
		}), { status: 400 })
	}

	// @ts-nocheck
	const fileBuffer: Uint8Array = await (file as any).arrayBuffer()
	// Compute the SHA256 hash of the file
	const hash = await crypto.subtle.digest('SHA-256', fileBuffer);
	const hashString = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');

	// Check if the IPA already exists using it's hash
	const exists = await env.IPA_METADATA_DB
		.prepare('SELECT * FROM IpaMetadata WHERE FileHash = ?')
		.bind(hashString)
		.first()

	// Generate a new IPA ID with uuid
	const id = uuidv4()

	// Get current unix timestamp
	const timestamp = Math.floor(Date.now() / 1000)

	// If the IPA already exists, add a new metadata entry but keep the same file
	if (!exists) {
		// Store the IPA in the store
		await env.IPA_STORE.put(hashString, fileBuffer)
	}

	// Insert the IPA metadata into the database
	const dbResults = await env.IPA_METADATA_DB
		.prepare('INSERT INTO IpaMetadata (Id, UploadDate, BundleIdentifier, BuildVersion, AppName, FileHash) VALUES (?, ?, ?, ?, ?, ?)')
		.bind(id, timestamp, query.bundleIdentifier, query.bundleVersion, query.appName, hashString)
		.run()

	if (dbResults.error) {
		return new Response(JSON.stringify({
			error: true,
			message: 'Failed to create IPA',
			details: dbResults.error,
		}), { status: 500 })
	}

	// Create manifest URL
	const baseUrl = new URL(req.url).origin
	const manifestUrl = `${baseUrl}/ipa/${id}/manifest`
	const otaUrl = `itms-services://?action=download-manifest&url=${manifestUrl}`

	return new Response(JSON.stringify({
		error: false,
		id,
		bundleIdentifier: query.bundleIdentifier,
		bundleVersion: query.bundleVersion,
		appName: query.appName,
		uploadDate: timestamp,
		fileHash: hashString,
		directOtaUrl: otaUrl,
		interactiveOtaUrl: `${baseUrl}/ipa/${id}/ota`,
		warning: exists ? 'IPA with identical hash already exists, new metadata entry created to reference the same file' : undefined,
	}), { status: 201 })
});

router.get('/ipa/:id/ota', async ({ env, req, ctx }) => {
	// Get base url for request
	const baseUrl = new URL(req.url).origin

	const ipaMetadata = await env.IPA_METADATA_DB
		.prepare('SELECT * FROM IpaMetadata WHERE Id = ?')
		.bind(req.params.id)
		.first()

	if (!ipaMetadata) {
		return new Response(JSON.stringify({
			error: true,
			message: `No IPA OTA entry found for id: ${req.params.id}`,
		}), { status: 404 })
	}

	const otaInstallPage = ipaOtaPage(
		ipaMetadata.BundleIdentifier as string,
		ipaMetadata.AppName as string,
		ipaMetadata.BuildVersion as string,
		ipaMetadata.FileHash as string,
		`${baseUrl}/ipa/${req.params.id}/manifest`
	)

	return new Response(otaInstallPage, {
		headers: {
			'Content-Type': 'text/html',
		}
	})
});

router.get('ipa/:id/manifest', async ({ env, req, ctx }) => {
	const ipaMetadata = await env.IPA_METADATA_DB
		.prepare('SELECT * FROM IpaMetadata WHERE Id = ?')
		.bind(req.params.id)
		.first()

	if (!ipaMetadata) {
		return new Response(JSON.stringify({
			error: true,
			message: `No IPA OTA entry found for id: ${req.params.id}`,
		}), { status: 404 })
	}

	// Download url
	const downloadUrl = `${new URL(req.url).origin}/ipa/${req.params.id}/download`

	const manifest = manifestTemplate(
		ipaMetadata.BundleIdentifier as string,
		ipaMetadata.AppName as string,
		ipaMetadata.BuildVersion as string,
		downloadUrl
	)

	return new Response(manifest, {
		headers: {
			'Content-Type': 'application/x-plist',
		}
	})
});

router.get('/ipa/:id/download', async ({ env, req, ctx }) => {
	const ipaMetadata = await env.IPA_METADATA_DB
		.prepare('SELECT * FROM IpaMetadata WHERE Id = ?')
		.bind(req.params.id)
		.first()

	if (!ipaMetadata) {
		return new Response(JSON.stringify({
			error: true,
			message: `No IPA OTA entry found for id: ${req.params.id}`,
		}), { status: 404 })
	}

	const filehash = ipaMetadata.FileHash as string

	const ipa = await env.IPA_STORE.get(filehash)

	if (!ipa) {
		return new Response(JSON.stringify({
			error: true,
			message: `No IPA file found with key: ${filehash}`,
		}), { status: 404 })
	}

	const headers = new Headers()
	ipa.writeHttpMetadata(headers)
	headers.set('etag', ipa.httpEtag);
	headers.set('content-disposition', `attachment; filename="${ipaMetadata.AppName}-${ipaMetadata.BuildVersion}.ipa"`)
	headers.set('content-type', 'application/octet-stream')
	return new Response(ipa.body, {
		headers,
	})
});

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext) {
		return router.handle(request, env, ctx)
	}
}
