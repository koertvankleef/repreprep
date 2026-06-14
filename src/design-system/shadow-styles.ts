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
    gap: var(--rrr-spacing-xl);
  }
`

export const pageHeaderStyles = `
  .header {
    display: flex;
    justify-content: space-between;
    gap: var(--rrr-spacing-l);
    align-items: center;
    flex-wrap: wrap;
  }
`

export const cardMdStyles = `
  .card {
    background: var(--rrr-colors-grayscale-00);
    border: var(--rrr-border-width) solid var(--rrr-colors-grayscale-30);
    border-radius: var(--rrr-radius-l);
    box-shadow: var(--rrr-shadow-card);
    padding: var(--rrr-spacing-l);
    display: grid;
    gap: var(--rrr-spacing-s);
  }
`

export const cardLgStyles = `
  .card {
    background: var(--rrr-colors-grayscale-00);
    border: var(--rrr-border-width) solid var(--rrr-colors-grayscale-30);
    border-radius: var(--rrr-radius-l);
    box-shadow: var(--rrr-shadow-card);
    padding: var(--rrr-spacing-xl);
    display: grid;
    gap: var(--rrr-spacing-l);
  }
`

export const wrapActionsStyles = `
  .actions {
    display: flex;
    gap: var(--rrr-spacing-s);
    flex-wrap: wrap;
  }
`
