import type {Organization} from 'sentry/types/organization';
import type {WebVitalsScoreBreakdown} from 'sentry/views/insights/browser/webVitals/queries/storedScoreQueries/useProjectWebVitalsScoresTimeseriesQuery';
import type {WebVitals} from 'sentry/views/insights/browser/webVitals/types';
import {getWeights} from 'sentry/views/insights/browser/webVitals/utils/getWeights';
import {PERFORMANCE_SCORE_WEIGHTS} from 'sentry/views/insights/browser/webVitals/utils/scoreThresholds';

// Returns a weighed score timeseries with each interval calculated from applying hardcoded weights to unweighted scores
export function applyStaticWeightsToTimeseries(
  organization: Organization,
  timeseriesData: WebVitalsScoreBreakdown
) {
  const weights = organization.features.includes(
    'performance-vitals-handle-missing-webvitals'
  )
    ? getWeights(
        Object.keys(timeseriesData)
          .filter(key => key !== 'total')
          .filter(key =>
            // @ts-ignore TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
            timeseriesData[key].some((series: any) => series.value > 0)
          ) as WebVitals[]
      )
    : PERFORMANCE_SCORE_WEIGHTS;
  return {
    ...Object.keys(weights).reduce((acc, webVital) => {
      // @ts-ignore TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      acc[webVital] = timeseriesData[webVital].map(({name, value}: any) => ({
        name,
        // @ts-ignore TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        value: value * weights[webVital] * 0.01,
      }));
      return acc;
    }, {}),
    total: timeseriesData.total,
  } as WebVitalsScoreBreakdown;
}
