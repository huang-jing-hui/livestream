import { useSync } from '@tldraw/sync'
import {
	AssetRecordType,
	getHashForString,
	TLAssetStore,
	TLBookmarkAsset, TLComponents,
	Tldraw, TLUserPreferences,
	uniqueId, useTldrawUser,
} from 'tldraw'
import {useState} from "react";
import {useLocalParticipant, useRoomContext} from "@livekit/components-react";

const WORKER_URL = `http://localhost:5858`


export function BaiBan() {
	const room = useRoomContext();
	const { localParticipant } = useLocalParticipant();
	const [userPreferences, setUserPreferences] = useState<TLUserPreferences>({
		id: 'user-' + Math.random(),
		name: localParticipant.identity,
		color: 'palevioletred',
		colorScheme: 'dark',
	})
  // 创建一个连接到多人的存储
  const store = useSync({
		// We need to know the websocket's URI...
		uri: `${WORKER_URL}/connect/${room.name}`,
		// ...and how to handle static assets like images & videos
		assets: multiplayerAssets,
	    userInfo: userPreferences
	})
	const user = useTldrawUser({ userPreferences, setUserPreferences })

	return (
		<div className="tldraw__editor" style={{ width: '100%', height: '100%' }}>
			<Tldraw

				// we can pass the connected store into the Tldraw component which will handle
				// loading states & enable multiplayer UX like cursors & a presence menu
				store={store}
				onMount={(editor) => {
					// @ts-expect-error
					window.editor = editor
					// when the editor is ready, we need to register out bookmark unfurling service
					editor.registerExternalAssetHandler('url', unfurlBookmarkUrl)
				}}
				user={user}
			/>
		</div>
	)
}

// How does our server handle assets like images and videos?
const multiplayerAssets: TLAssetStore = {
	// to upload an asset, we prefix it with a unique id, POST it to our worker, and return the URL
	async upload(_asset, file) {
		const id = uniqueId()

		const objectName = `${id}-${file.name}`
		const url = `${WORKER_URL}/uploads/${encodeURIComponent(objectName)}`

		const response = await fetch(url, {
			method: 'PUT',
			body: file,
		})

		if (!response.ok) {
			throw new Error(`Failed to upload asset: ${response.statusText}`)
		}

		return { src: url }
	},
	// to retrieve an asset, we can just use the same URL. you could customize this to add extra
	// auth, or to serve optimized versions / sizes of the asset.
	resolve(asset) {
		return asset.props.src
	},
}

// How does our server handle bookmark unfurling?
async function unfurlBookmarkUrl({ url }: { url: string }): Promise<TLBookmarkAsset> {
	const asset: TLBookmarkAsset = {
		id: AssetRecordType.createId(getHashForString(url)),
		typeName: 'asset',
		type: 'bookmark',
		meta: {},
		props: {
			src: url,
			description: '',
			image: '',
			favicon: '',
			title: '',
		},
	}

	try {
		const response = await fetch(`${WORKER_URL}/unfurl?url=${encodeURIComponent(url)}`)
		const data = await response.json()

		asset.props.description = data?.description ?? ''
		asset.props.image = data?.image ?? ''
		asset.props.favicon = data?.favicon ?? ''
		asset.props.title = data?.title ?? ''
	} catch (e) {
		console.error(e)
	}

	return asset
}


