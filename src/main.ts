import { initLocale } from './i18n/index.ts'

initLocale(navigator.language)

const { registerDesignSystemComponents } = await import('./design-system/components/register.ts')
const { registerAppComponents } = await import('./app/register-app-components.ts')

registerDesignSystemComponents()
registerAppComponents()
