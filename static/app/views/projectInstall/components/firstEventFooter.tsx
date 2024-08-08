import {Fragment} from 'react';
import styled from '@emotion/styled';

import {Button} from 'sentry/components/button';
import ButtonBar from 'sentry/components/buttonBar';
import {t, tct} from 'sentry/locale';
import type {Organization} from 'sentry/types/organization';
import type {Project} from 'sentry/types/project';
import FirstEventIndicator from 'sentry/views/onboarding/components/firstEventIndicator';
import CreateSampleEventButton from 'sentry/views/onboarding/createSampleEventButton';

interface FirstEventFooterProps {
  organization: Organization;
  project: Project;
  docsLink?: string;
  docsOnClick?: () => void;
}

export default function FirstEventFooter({
  organization,
  project,
  docsLink,
  docsOnClick,
}: FirstEventFooterProps) {
  return (
    <Fragment>
      <FirstEventIndicator
        organization={organization}
        project={project}
        eventType="error"
      >
        {({indicator, firstEventButton}) => (
          <CTAFooter>
            <Actions gap={2}>
              {firstEventButton}
              <Button external href={docsLink} onClick={docsOnClick}>
                {t('View full documentation')}
              </Button>
            </Actions>
            {indicator}
          </CTAFooter>
        )}
      </FirstEventIndicator>
      <CTASecondary>
        {tct(
          'Just want to poke around before getting too cozy with the SDK? [sample:View a sample event for this SDK] or [skip:finish setup later].',
          {
            sample: (
              <CreateSampleEventButton
                aria-label={t('View a sample event')}
                project={project}
                source="onboarding"
                priority="link"
              />
            ),
            skip: (
              <Button priority="link" href="/" aria-label={t('Finish setup later')} />
            ),
          }
        )}
      </CTASecondary>
    </Fragment>
  );
}

const CTAFooter = styled('div')`
  display: flex;
  justify-content: space-between;
  margin: ${p => p.theme.space(2)} 0;
  margin-top: ${p => p.theme.space(4)};
`;

const CTASecondary = styled('p')`
  color: ${p => p.theme.subText};
  font-size: ${p => p.theme.fontSizeMedium};
  margin: 0;
  max-width: 500px;
`;

const Actions = styled(ButtonBar)`
  display: inline-grid;
  justify-self: start;
`;
