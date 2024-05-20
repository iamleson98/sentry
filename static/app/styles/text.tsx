import {css} from '@emotion/react';

/**
 * Use `p.theme.textStyles` instead of importing this.
 *
 * @deprecated
 */
const textStyles = () => css`
  /* stylelint-disable no-descending-specificity */
  h1,
  h2,
  h3,
  h4,
  h5,
  h6,
  p,
  /* Exclude ol/ul elements inside interactive selectors/menus */
  ul:not([role='listbox'], [role='grid'], [role='menu']),
  ol:not([role='listbox'], [role='grid'], [role='menu']),
  table,
  dl,
  blockquote,
  form,
  pre,
  .auto-select-text,
  .section,
  [class^='highlight-'] {
    margin-bottom: 20px;

    &:last-child {
      margin-bottom: 0;
    }
  }
  /* stylelint-enable */
`;

export default textStyles;
