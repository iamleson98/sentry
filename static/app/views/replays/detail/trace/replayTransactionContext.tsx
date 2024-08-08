import type {ReactNode} from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type {Location} from 'history';
import sortBy from 'lodash/sortBy';

import {getTimeStampFromTableDateField, getUtcDateString} from 'sentry/utils/dates';
import type {TableData} from 'sentry/utils/discover/discoverQuery';
import EventView from 'sentry/utils/discover/eventView';
import {doDiscoverQuery} from 'sentry/utils/discover/genericDiscoverQuery';
import type {ParsedHeader} from 'sentry/utils/parseLinkHeader';
import parseLinkHeader from 'sentry/utils/parseLinkHeader';
import type {
  TraceError,
  TraceFullDetailed,
  TraceSplitResults,
} from 'sentry/utils/performance/quickTrace/types';
import {
  getTraceRequestPayload,
  makeEventView,
} from 'sentry/utils/performance/quickTrace/utils';
import useEmitTimestampChanges from 'sentry/utils/replays/playback/hooks/useEmitTimestampChanges';
import useApi from 'sentry/utils/useApi';
import useOrganization from 'sentry/utils/useOrganization';
import {getTraceSplitResults} from 'sentry/views/performance/traceDetails/utils';
import type {ReplayRecord} from 'sentry/views/replays/types';

type Options = {
  children: ReactNode;
  replayRecord: undefined | ReplayRecord;
};

type InternalState = {
  detailsErrors: Error[];
  detailsRequests: number;
  detailsResponses: number;
  didInit: boolean;
  indexComplete: boolean;
  indexError: undefined | Error;
  isFetching: boolean;
  traces: undefined | TraceFullDetailed[];
  orphanErrors?: TraceError[];
};

export type ExternalState = {
  didInit: boolean;
  errors: Error[];
  isFetching: boolean;
  traces: undefined | TraceFullDetailed[];
  orphanErrors?: TraceError[];
};

const INITIAL_STATE: InternalState = {
  detailsErrors: [],
  detailsRequests: 0,
  detailsResponses: 0,
  didInit: false,
  indexComplete: true,
  indexError: undefined,
  isFetching: false,
  traces: undefined,
  orphanErrors: undefined,
};

type TxnContextProps = {
  eventView: null | EventView;
  fetchTransactionData: () => void;
  state: ExternalState;
};

const TxnContext = createContext<TxnContextProps>({
  eventView: null,
  fetchTransactionData: () => {},
  state: {didInit: false, errors: [], isFetching: false, traces: []},
});

function ReplayTransactionContext({children, replayRecord}: Options) {
  const api = useApi();
  const organization = useOrganization();
  useEmitTimestampChanges();

  const [state, setState] = useState<InternalState>(INITIAL_STATE);

  const orgSlug = organization.slug;

  const listEventView = useMemo(() => {
    if (!replayRecord) {
      return null;
    }
    const replayId = replayRecord?.id;
    const projectId = replayRecord?.project_id;
    const start = getUtcDateString(replayRecord?.started_at.getTime());
    const end = getUtcDateString(replayRecord?.finished_at.getTime());

    return EventView.fromSavedQuery({
      id: undefined,
      name: `Traces in replay ${replayId}`,
      fields: ['trace', 'count(trace)', 'min(timestamp)'],
      orderby: 'min_timestamp',
      query: `replayId:${replayId}`,
      projects: [Number(projectId)],
      version: 2,
      start,
      end,
    });
  }, [replayRecord]);

  const fetchSingleTraceData = useCallback(
    async dataRow => {
      try {
        const {trace: traceId, timestamp} = dataRow;
        const start = getUtcDateString(replayRecord?.started_at.getTime());
        const end = getUtcDateString(replayRecord?.finished_at.getTime());
        const eventView = makeEventView({start, end});
        let payload;

        if (organization.features.includes('replay-trace-view-v1')) {
          payload = {
            limit: 10000,
            useSpans: 1,
            timestamp,
          };
        } else {
          payload = getTraceRequestPayload({eventView, location: {} as Location});
        }

        const [trace, _traceResp] = await doDiscoverQuery<
          TraceSplitResults<TraceFullDetailed> | TraceFullDetailed[]
        >(api, `/organizations/${orgSlug}/events-trace/${traceId}/`, payload);

        const {transactions, orphanErrors} = getTraceSplitResults<TraceFullDetailed>(
          trace,
          organization
        );

        setState(prev => {
          return {
            ...prev,
            traces: sortBy(
              (prev.traces || []).concat(transactions ?? (trace as TraceFullDetailed[])),
              'start_timestamp'
            ),
            orphanErrors: sortBy(
              (prev.orphanErrors || []).concat(orphanErrors ?? []),
              'timestamp'
            ),
          };
        });
      } catch (error) {
        setState(prev => ({
          ...prev,
          detailsErrors: prev.detailsErrors.concat(error),
        }));
      }
    },
    [api, orgSlug, organization, replayRecord]
  );

  const fetchTracesInBatches = useCallback(
    async data => {
      const clonedData = [...data];

      while (clonedData.length > 0) {
        const batch = clonedData.splice(0, 3);

        // Update state for the current batch request
        setState(
          prev =>
            ({
              ...prev,
              detailsRequests: prev.detailsRequests + batch.length,
            }) as InternalState
        );

        // Wait for the current batch to finish
        await Promise.allSettled(batch.map(fetchSingleTraceData));

        // Update state for the current batch response
        setState(
          prev =>
            ({
              ...prev,
              detailsResponses: prev.detailsResponses + batch.length,
            }) as InternalState
        );
      }
    },
    [fetchSingleTraceData]
  );

  const fetchTransactionData = useCallback(async () => {
    if (!listEventView) {
      return;
    }
    const start = getUtcDateString(replayRecord?.started_at.getTime());
    const end = getUtcDateString(replayRecord?.finished_at.getTime());

    setState({
      detailsErrors: [],
      detailsRequests: 0,
      detailsResponses: 0,
      didInit: true,
      indexComplete: false,
      indexError: undefined,
      isFetching: true,
      traces: [],
    });

    let cursor = {
      cursor: '0:0:0',
      results: true,
      href: '',
    } as ParsedHeader;
    while (cursor.results) {
      const payload = {
        ...listEventView.getEventsAPIPayload({
          start,
          end,
          limit: 10,
        } as unknown as Location),
        sort: ['min_timestamp', 'trace'],
        cursor: cursor.cursor,
      };

      try {
        const [{data}, , listResp] = await doDiscoverQuery<TableData>(
          api,
          `/organizations/${orgSlug}/events/`,
          payload
        );

        const parsedData = data
          .filter(row => row.trace) // Filter out items where trace is not truthy
          .map(row => ({
            trace: row.trace,
            timestamp: getTimeStampFromTableDateField(row['min(timestamp)']),
          }));

        (async function () {
          await fetchTracesInBatches(parsedData);
        })();

        const pageLinks = listResp?.getResponseHeader('Link') ?? null;
        cursor = parseLinkHeader(pageLinks)?.next;
        const indexComplete = !cursor.results;
        setState(
          prev =>
            ({
              ...prev,
              indexComplete,
            }) as InternalState
        );
      } catch (indexError) {
        setState(
          prev =>
            ({
              ...prev,
              indexError,
              indexComplete: true,
            }) as InternalState
        );
        cursor = {cursor: '', results: false, href: ''} as ParsedHeader;
      }
    }
  }, [api, listEventView, orgSlug, replayRecord, fetchTracesInBatches]);

  const externalState = useMemo(() => internalToExternalState(state), [state]);

  return (
    <TxnContext.Provider
      value={{
        eventView: listEventView,
        fetchTransactionData,
        state: externalState,
      }}
    >
      {children}
    </TxnContext.Provider>
  );
}

function internalToExternalState({
  detailsRequests,
  detailsResponses,
  didInit,
  indexComplete,
  indexError,
  traces,
  orphanErrors,
}: InternalState): ExternalState {
  const isComplete = indexComplete && detailsRequests === detailsResponses;

  return {
    didInit,
    errors: indexError ? [indexError] : [], // Ignoring detailsErrors for now
    isFetching: !isComplete,
    traces,
    orphanErrors,
  };
}

export default ReplayTransactionContext;

export const useFetchTransactions = () => {
  const {fetchTransactionData, state} = useContext(TxnContext);

  useEffect(() => {
    if (!state.isFetching && state.traces === undefined) {
      fetchTransactionData();
    }
  }, [fetchTransactionData, state]);
};

export const useTransactionData = () => {
  const {eventView, state} = useContext(TxnContext);
  const data = useMemo(() => ({eventView, state}), [eventView, state]);
  return data;
};
