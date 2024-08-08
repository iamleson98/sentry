import {Children} from 'react';
import styled from '@emotion/styled';

const FiltersGrid = styled('div')`
  display: grid;
  flex-grow: 1;
  gap: ${p => p.theme.space(1)};
  grid-template-columns:
    repeat(${p => Children.toArray(p.children).length - 1}, max-content)
    1fr;
  margin-bottom: ${p => p.theme.space(1)};
  @media (max-width: ${p => p.theme.breakpoints.small}) {
    margin-top: ${p => p.theme.space(1)};
  }
`;

export default FiltersGrid;
