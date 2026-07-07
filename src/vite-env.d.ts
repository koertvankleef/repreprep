/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_STORAGE_DRIVER?: 'local' | 'memory'
}

interface ImportMeta {
	readonly env: ImportMetaEnv
}
