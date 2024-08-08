import styled from '@emotion/styled';

import FieldControlState from './fieldControlState';
import type {FieldGroupProps} from './types';

type FieldControlProps = Pick<
  FieldGroupProps,
  | 'alignRight'
  | 'controlState'
  | 'flexibleControlStateSize'
  | 'hideControlState'
  | 'inline'
> & {
  children: React.ReactNode;
};

function FieldControl({
  inline,
  alignRight,
  controlState,
  children,
  hideControlState,
  flexibleControlStateSize,
}: FieldControlProps) {
  return (
    <FieldControlWrapper inline={inline}>
      <FieldControlStyled alignRight={alignRight}>{children}</FieldControlStyled>

      {!hideControlState && (
        <FieldControlState flexibleControlStateSize={!!flexibleControlStateSize}>
          {controlState}
        </FieldControlState>
      )}
    </FieldControlWrapper>
  );
}

export default FieldControl;

const FieldControlWrapper = styled('div')<{inline?: boolean}>`
  display: flex;
  flex: 1;
  ${p => p.inline && `padding-left: ${p.theme.space(2)}`};
`;

const FieldControlStyled = styled('div')<{alignRight?: boolean}>`
  display: flex;
  flex: 1;
  flex-direction: column;
  position: relative;
  max-width: 100%;
  ${p => (p.alignRight ? 'align-items: flex-end;' : '')};
`;
