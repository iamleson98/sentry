import styled from '@emotion/styled';
import type {Location} from 'history';

import ProjectBadge from 'sentry/components/idBadge/projectBadge';
import Link from 'sentry/components/links/link';
import {generateTraceTarget} from 'sentry/components/quickTrace/utils';
import {t, tn} from 'sentry/locale';
import {space} from 'sentry/styles/space';
import type {Event} from 'sentry/types/event';
import {trackAnalytics} from 'sentry/utils/analytics';
import {useLocation} from 'sentry/utils/useLocation';
import useOrganization from 'sentry/utils/useOrganization';
import useProjects from 'sentry/utils/useProjects';

import type {TimelineEvent} from './useTraceTimelineEvents';

interface TraceTimelineTooltipProps {
  event: Event;
  timelineEvents: TimelineEvent[];
}

export function TraceTimelineTooltip({event, timelineEvents}: TraceTimelineTooltipProps) {
  const organization = useOrganization();
  const location = useLocation();
  // TODO: should handling of current event + other events look different
  if (timelineEvents.length === 1 && timelineEvents[0].id === event.id) {
    return <YouAreHere>{t('You are here')}</YouAreHere>;
  }

  const filteredTimelineEvents = timelineEvents.filter(
    timelineEvent => timelineEvent.id !== event.id
  );
  const displayYouAreHere = filteredTimelineEvents.length !== timelineEvents.length;
  const hasTitle = filteredTimelineEvents.length > 1 || displayYouAreHere;
  return (
    <UnstyledUnorderedList>
      {displayYouAreHere && <YouAreHereItem>{t('You are here')}</YouAreHereItem>}
      <EventItemsWrapper hasTitle={hasTitle}>
        {hasTitle && <EventItemsTitle>{t('Around the same time')}</EventItemsTitle>}
        {filteredTimelineEvents.slice(0, 3).map(timelineEvent => {
          return (
            <EventItem
              key={timelineEvent.id}
              timelineEvent={timelineEvent}
              location={location}
            />
          );
        })}
      </EventItemsWrapper>
      {filteredTimelineEvents.length > 3 && (
        <TraceItem>
          <Link
            to={generateTraceTarget(event, organization, location)}
            onClick={() => {
              trackAnalytics(
                'issue_details.issue_tab.trace_timeline_more_events_clicked',
                {
                  organization,
                  num_hidden: filteredTimelineEvents.length - 3,
                }
              );
            }}
          >
            {tn(
              'View %s more event',
              'View %s more events',
              filteredTimelineEvents.length - 3
            )}
          </Link>
        </TraceItem>
      )}
    </UnstyledUnorderedList>
  );
}

interface EventItemProps {
  location: Location;
  timelineEvent: TimelineEvent;
}

function EventItem({timelineEvent, location}: EventItemProps) {
  const organization = useOrganization();
  const {projects} = useProjects({
    slugs: [timelineEvent.project],
    orgId: organization.slug,
  });
  const project = projects.find(p => p.slug === timelineEvent.project);
  return (
    <EventItemRoot
      to={{
        pathname: `/organizations/${organization.slug}/issues/${timelineEvent['issue.id']}/events/${timelineEvent.id}/`,
        query: {
          ...location.query,
          project: undefined,
          referrer: 'issues_trace_timeline',
        },
      }}
      onClick={() => {
        trackAnalytics('issue_details.issue_tab.trace_timeline_clicked', {
          organization,
          event_id: timelineEvent.id,
          group_id: `${timelineEvent['issue.id']}`,
        });
      }}
    >
      {project && <ProjectBadge project={project} avatarSize={18} hideName disableLink />}
      <EventTitleWrapper>
        <EventTitle>{timelineEvent.title}</EventTitle>
        <EventDescription>
          {timelineEvent.transaction
            ? timelineEvent.transaction
            : 'stack.function' in timelineEvent
              ? timelineEvent['stack.function'].at(-1)
              : null}
        </EventDescription>
      </EventTitleWrapper>
    </EventItemRoot>
  );
}

const UnstyledUnorderedList = styled('div')`
  display: flex;
  flex-direction: column;
  text-align: left;
  width: 220px;
`;

const EventItemsWrapper = styled('div')<{hasTitle: boolean}>`
  display: flex;
  flex-direction: column;
  padding: ${p => space(p.hasTitle ? 1 : 0.5)} ${p => p.theme.space(0.5)}
    ${p => p.theme.space(0.5)} ${p => p.theme.space(0.5)};
`;

const EventItemsTitle = styled('div')`
  padding-left: ${p => p.theme.space(1)};
  text-transform: uppercase;
  font-size: ${p => p.theme.fontSizeExtraSmall};
  font-weight: ${p => p.theme.fontWeightBold};
  color: ${p => p.theme.subText};
`;

const YouAreHere = styled('div')`
  padding: ${p => p.theme.space(1)} ${p => p.theme.space(2)};
  text-align: center;
  font-size: ${p => p.theme.fontSizeMedium};
`;

const YouAreHereItem = styled('div')`
  padding: ${p => p.theme.space(1)} ${p => p.theme.space(2)};
  text-align: center;
  border-bottom: 1px solid ${p => p.theme.innerBorder};
  font-size: ${p => p.theme.fontSizeMedium};
`;

const EventItemRoot = styled(Link)`
  display: grid;
  grid-template-columns: max-content auto;
  color: ${p => p.theme.textColor};
  gap: ${p => p.theme.space(1)};
  width: 100%;
  padding: ${p => p.theme.space(1)} ${p => p.theme.space(1)} ${p => p.theme.space(0.5)}
    ${p => p.theme.space(1)};
  border-radius: ${p => p.theme.borderRadius};
  font-size: ${p => p.theme.fontSizeSmall};

  &:hover {
    background-color: ${p => p.theme.surface200};
    color: ${p => p.theme.textColor};
  }
`;

const EventTitleWrapper = styled('div')`
  width: 100%;
  overflow: hidden;
  line-height: 1.2;
`;

const EventTitle = styled('div')`
  ${p => p.theme.overflowEllipsis};
  font-weight: ${p => p.theme.fontWeightBold};
`;

const EventDescription = styled('div')`
  ${p => p.theme.overflowEllipsis};
  direction: rtl;
`;

const TraceItem = styled('div')`
  padding: ${p => p.theme.space(1)} ${p => p.theme.space(1.5)};
  border-radius: ${p => p.theme.borderRadius};
  border-top: 1px solid ${p => p.theme.innerBorder};
`;
