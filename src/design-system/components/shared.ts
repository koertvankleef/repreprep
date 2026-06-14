export function defineCustomElementOnce(tagName: string, ctor: CustomElementConstructor): void {
  if (!customElements.get(tagName)) {
    customElements.define(tagName, ctor)
  }
}

export function reflectDisabled(host: HTMLElement, control: { disabled: boolean }): void {
  control.disabled = host.hasAttribute('disabled')
  host.setAttribute('aria-disabled', control.disabled ? 'true' : 'false')
}
