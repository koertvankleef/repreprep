import { initLocale } from './i18n/index.ts'
import { registerDesignSystemComponents } from './design-system/components/register.ts'
import { registerAppComponents } from './app/register-app-components.ts'

initLocale(navigator.language)
registerDesignSystemComponents()
registerAppComponents()
