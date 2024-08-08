import type {ReactNode} from 'react';
import styled from '@emotion/styled';

const SectionWrapper = styled('section')`
  display: flex;
  flex-direction: column;
  gap: ${p => p.theme.space(1)};
`;

const SectionTitle = styled('h3')`
  margin: 0;
  color: ${p => p.theme.gray300};
  font-size: ${p => p.theme.fontSizeMedium};
  text-transform: capitalize;

  display: flex;
  gap: ${p => p.theme.space(0.5)};
  align-items: center;
  justify-content: space-between;
`;

const LeftAlignedContent = styled('div')`
  display: flex;
  align-items: center;
  gap: ${p => p.theme.space(0.5)};
`;

export default function Section({
  children,
  icon,
  title,
  contentRight,
}: {
  children: ReactNode;
  contentRight?: ReactNode;
  icon?: ReactNode;
  title?: ReactNode;
}) {
  return (
    <SectionWrapper>
      {title ? (
        <SectionTitle>
          <LeftAlignedContent>
            {icon}
            {title}
          </LeftAlignedContent>
          {contentRight}
        </SectionTitle>
      ) : null}
      {children}
    </SectionWrapper>
  );
}
