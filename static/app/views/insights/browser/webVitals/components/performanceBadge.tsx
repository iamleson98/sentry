import styled from '@emotion/styled';

import {PERFORMANCE_SCORE_COLORS} from 'sentry/views/insights/browser/webVitals/utils/performanceScoreColors';
import {
  scoreToStatus,
  STATUS_TEXT,
} from 'sentry/views/insights/browser/webVitals/utils/scoreToStatus';

type Props = {
  score: number;
};

export function PerformanceBadge({score}: Props) {
  const status = scoreToStatus(score);
  return (
    <Badge status={status}>
      {STATUS_TEXT[status]} {score}
    </Badge>
  );
}

export const Badge = styled('div')<{status: string}>`
  white-space: nowrap;
  border-radius: 12px;
  color: ${p => p.theme[PERFORMANCE_SCORE_COLORS[p.status].normal]};
  background-color: ${p => p.theme[PERFORMANCE_SCORE_COLORS[p.status].light]};
  border: solid 1px ${p => p.theme[PERFORMANCE_SCORE_COLORS[p.status].light]};
  font-size: ${p => p.theme.fontSizeExtraSmall};
  padding: 0 ${p => p.theme.space(1)};
  display: inline-block;
  height: 17px;
`;
