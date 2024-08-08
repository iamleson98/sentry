import {Fragment} from 'react';
import styled from '@emotion/styled';
import type {Location} from 'history';

import {Button} from 'sentry/components/button';
import ButtonBar from 'sentry/components/buttonBar';
import {DatePageFilter} from 'sentry/components/organizations/datePageFilter';
import {EnvironmentPageFilter} from 'sentry/components/organizations/environmentPageFilter';
import PageFilterBar from 'sentry/components/organizations/pageFilterBar';
import {ProjectPageFilter} from 'sentry/components/organizations/projectPageFilter';
import {t} from 'sentry/locale';
import {defined} from 'sentry/utils';
import {ToggleOnDemand} from 'sentry/utils/performance/contexts/onDemandControl';
import {decodeList} from 'sentry/utils/queryString';
import {ReleasesProvider} from 'sentry/utils/releases/releasesProvider';
import useOrganization from 'sentry/utils/useOrganization';
import usePageFilters from 'sentry/utils/usePageFilters';

import ReleasesSelectControl from './releasesSelectControl';
import type {DashboardFilters} from './types';
import {DashboardFilterKeys} from './types';

type FiltersBarProps = {
  filters: DashboardFilters;
  hasUnsavedChanges: boolean;
  isEditingDashboard: boolean;
  isPreview: boolean;
  location: Location;
  onDashboardFilterChange: (activeFilters: DashboardFilters) => void;
  onCancel?: () => void;
  onSave?: () => void;
};

export default function FiltersBar({
  filters,
  hasUnsavedChanges,
  isEditingDashboard,
  isPreview,
  location,
  onCancel,
  onDashboardFilterChange,
  onSave,
}: FiltersBarProps) {
  const {selection} = usePageFilters();
  const organization = useOrganization();

  const selectedReleases =
    (defined(location.query?.[DashboardFilterKeys.RELEASE])
      ? decodeList(location.query[DashboardFilterKeys.RELEASE])
      : filters?.[DashboardFilterKeys.RELEASE]) ?? [];

  return (
    <Wrapper>
      <PageFilterBar condensed>
        <ProjectPageFilter disabled={isEditingDashboard} />
        <EnvironmentPageFilter disabled={isEditingDashboard} />
        <DatePageFilter disabled={isEditingDashboard} />
      </PageFilterBar>
      <Fragment>
        <FilterButtons>
          <ReleasesProvider organization={organization} selection={selection}>
            <ReleasesSelectControl
              handleChangeFilter={onDashboardFilterChange}
              selectedReleases={selectedReleases}
              isDisabled={isEditingDashboard}
            />
          </ReleasesProvider>
        </FilterButtons>
        {hasUnsavedChanges && !isEditingDashboard && !isPreview && (
          <FilterButtons>
            <Button priority="primary" onClick={onSave}>
              {t('Save')}
            </Button>
            <Button onClick={onCancel}>{t('Cancel')}</Button>
          </FilterButtons>
        )}
      </Fragment>
      <ToggleOnDemand />
    </Wrapper>
  );
}

const Wrapper = styled('div')`
  display: flex;
  flex-direction: row;
  gap: ${p => p.theme.space(1.5)};
  margin-bottom: ${p => p.theme.space(2)};

  @media (max-width: ${p => p.theme.breakpoints.small}) {
    display: grid;
    grid-auto-flow: row;
  }
`;

const FilterButtons = styled(ButtonBar)`
  display: grid;
  gap: ${p => p.theme.space(1.5)};

  @media (min-width: ${p => p.theme.breakpoints.small}) {
    display: flex;
    align-items: flex-start;
    gap: ${p => p.theme.space(1.5)};
  }
`;
