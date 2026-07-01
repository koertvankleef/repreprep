import { mountIconSprite } from './design-system/icons/sprite.ts'
import { applyLanguagePreference, loadLanguagePreference } from './app/language-preferences.ts'

applyLanguagePreference(loadLanguagePreference())
mountIconSprite()

if (!import.meta.env.DEV && 'serviceWorker' in navigator) {
	window.addEventListener('load', () => {
		void navigator.serviceWorker.register('./serviceworker.js')
	})
}

const { registerDesignSystemComponents } = await import('./design-system/components/register.ts')
const { registerAppComponents } = await import('./app/register-app-components.ts')

registerDesignSystemComponents()
registerAppComponents()
