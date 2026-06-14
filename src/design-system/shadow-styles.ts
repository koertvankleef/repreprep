export const shadowTypographyStyles = `
  :host {
    display: block;
    font-family: var(--rrr-font-family);
  }

  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    font-family: var(--rrr-font-family-heading);
  }

  button,
  input,
  select,
  textarea {
    font: inherit;
  }
`

export const pageLayoutStyles = `
  .page {
    display: grid;
    gap: var(--rrr-space-lg);
  }
`

export const pageHeaderStyles = `
  .header {
    display: flex;
    justify-content: space-between;
    gap: var(--rrr-space-md);
    align-items: center;
    flex-wrap: wrap;
  }
`

export const cardMdStyles = `
  .card {
    background: var(--rrr-color-surface);
    border: 1px solid var(--rrr-color-border);
    border-radius: var(--rrr-radius-lg);
    padding: var(--rrr-space-md);
    display: grid;
    gap: var(--rrr-space-sm);
  }
`

export const cardLgStyles = `
  .card {
    background: var(--rrr-color-surface);
    border: 1px solid var(--rrr-color-border);
    border-radius: var(--rrr-radius-lg);
    padding: var(--rrr-space-lg);
    display: grid;
    gap: var(--rrr-space-md);
  }
`

export const wrapActionsStyles = `
  .actions {
    display: flex;
    gap: var(--rrr-space-sm);
    flex-wrap: wrap;
  }
`
