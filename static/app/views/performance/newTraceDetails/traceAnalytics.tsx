import type {Organization} from 'sentry/types/organization';
import {trackAnalytics} from 'sentry/utils/analytics';
import type {TraceType} from 'sentry/views/performance/traceDetails/newTraceDetailsContent';

const trackLayoutChange = (layout: string, organization: Organization) =>
  trackAnalytics('trace.trace_layout.change', {
    layout,
    organization,
  });

const trackDrawerMinimize = (organization: Organization) =>
  trackAnalytics('trace.trace_layout.drawer_minimize', {
    organization,
  });

const trackShowInView = (organization: Organization) =>
  trackAnalytics('trace.trace_layout.show_in_view', {
    organization,
  });

const trackViewEventDetails = (organization: Organization) =>
  trackAnalytics('trace.trace_layout.view_event_details', {
    organization,
  });

const trackViewEventJSON = (organization: Organization) =>
  trackAnalytics('trace.trace_layout.view_event_json', {
    organization,
  });

const trackTabPin = (organization: Organization) =>
  trackAnalytics('trace.trace_layout.tab_pin', {
    organization,
  });

const trackTabView = (tab: string, organization: Organization) =>
  trackAnalytics('trace.trace_layout.tab_view', {
    organization,
    tab,
  });

const trackSearchFocus = (organization: Organization) =>
  trackAnalytics('trace.trace_layout.search_focus', {
    organization,
  });

const trackResetZoom = (organization: Organization) =>
  trackAnalytics('trace.trace_layout.reset_zoom', {
    organization,
  });

const trackViewShortcuts = (organization: Organization) =>
  trackAnalytics('trace.trace_layout.view_shortcuts', {
    organization,
  });

const trackTraceWarningType = (type: TraceType, organization: Organization) =>
  trackAnalytics('trace.trace_warning_type', {
    organization,
    type,
  });

const traceAnalytics = {
  // Drawer actions
  trackShowInView,
  trackViewEventDetails,
  trackViewEventJSON,
  // Layout actions
  trackLayoutChange,
  trackDrawerMinimize,
  trackSearchFocus,
  trackTabPin,
  trackTabView,
  // Toolbar actions
  trackResetZoom,
  trackViewShortcuts,
  trackTraceWarningType,
};

export {traceAnalytics};
