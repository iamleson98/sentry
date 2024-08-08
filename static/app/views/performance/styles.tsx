import styled from '@emotion/styled';

export const GridCell = styled('div')`
  font-size: 14px;
`;

export const GridCellNumber = styled(GridCell)`
  text-align: right;
  font-variant-numeric: tabular-nums;
  flex-grow: 1;
`;

export const DoubleHeaderContainer = styled('div')`
  display: grid;
  grid-template-columns: 1fr 1fr;
  padding: ${p => p.theme.space(2)} ${p => p.theme.space(3)} ${p => p.theme.space(1)}
    ${p => p.theme.space(3)};
  gap: ${p => p.theme.space(3)};
`;

export const ErrorPanel = styled('div')`
  display: flex;
  justify-content: center;
  align-items: center;

  flex: 1;
  flex-shrink: 0;
  overflow: hidden;
  height: 200px;
  position: relative;
  border-color: transparent;
  margin-bottom: 0;
`;
