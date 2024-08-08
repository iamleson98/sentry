import {useMemo, useRef} from 'react';
import styled from '@emotion/styled';

import {Button} from 'sentry/components/button';
import {inputStyles} from 'sentry/components/input';
import {
  SearchQueryBuilerContext,
  useSearchQueryBuilder,
} from 'sentry/components/searchQueryBuilder/context';
import {useHandleSearch} from 'sentry/components/searchQueryBuilder/hooks/useHandleSearch';
import {useQueryBuilderState} from 'sentry/components/searchQueryBuilder/hooks/useQueryBuilderState';
import {PlainTextQueryInput} from 'sentry/components/searchQueryBuilder/plainTextQueryInput';
import {TokenizedQueryGrid} from 'sentry/components/searchQueryBuilder/tokenizedQueryGrid';
import {
  type CallbackSearchState,
  type FieldDefinitionGetter,
  type FilterKeySection,
  QueryInterfaceType,
} from 'sentry/components/searchQueryBuilder/types';
import {
  parseQueryBuilderValue,
  queryIsValid,
} from 'sentry/components/searchQueryBuilder/utils';
import type {SearchConfig} from 'sentry/components/searchSyntax/parser';
import {IconClose, IconSearch} from 'sentry/icons';
import {t} from 'sentry/locale';
import type {SavedSearchType, Tag, TagCollection} from 'sentry/types/group';
import {getFieldDefinition} from 'sentry/utils/fields';
import PanelProvider from 'sentry/utils/panelProvider';
import {useDimensions} from 'sentry/utils/useDimensions';
import {useEffectAfterFirstRender} from 'sentry/utils/useEffectAfterFirstRender';
import usePrevious from 'sentry/utils/usePrevious';

export interface SearchQueryBuilderProps {
  /**
   * A complete mapping of all possible filter keys.
   * Filter keys not included will not show up when typing and may be shown as invalid.
   * Should be a stable reference.
   */
  filterKeys: TagCollection;
  getTagValues: (key: Tag, query: string) => Promise<string[]>;
  initialQuery: string;
  /**
   * Indicates the usage of the search bar for analytics
   */
  searchSource: string;
  className?: string;
  disabled?: boolean;
  /**
   * When true, free text will be marked as invalid.
   */
  disallowFreeText?: boolean;
  /**
   * When true, parens and logical operators (AND, OR) will be marked as invalid.
   */
  disallowLogicalOperators?: boolean;
  /**
   * When true, unsupported filter keys will be highlighted as invalid.
   */
  disallowUnsupportedFilters?: boolean;
  /**
   * When true, the wildcard (*) in filter values or free text will be marked as invalid.
   */
  disallowWildcard?: boolean;
  /**
   * The lookup strategy for field definitions.
   * Each SearchQueryBuilder instance can support a different list of fields and
   * tags, their definitions may not overlap.
   */
  fieldDefinitionGetter?: FieldDefinitionGetter;
  /**
   * The width of the filter key menu.
   * Defaults to 360px. May be increased if there are a large number of categories
   * or long filter key names.
   */
  filterKeyMenuWidth?: number;
  /**
   * When provided, displays a tabbed interface for discovering filter keys.
   * Sections and filter keys are displayed in the order they are provided.
   */
  filterKeySections?: FilterKeySection[];
  /**
   * Allows for customization of the invalid token messages.
   */
  invalidMessages?: SearchConfig['invalidMessages'];
  label?: string;
  onBlur?: (query: string, state: CallbackSearchState) => void;
  /**
   * Called when the query value changes
   */
  onChange?: (query: string, state: CallbackSearchState) => void;
  /**
   * Called when the user presses enter
   */
  onSearch?: (query: string, state: CallbackSearchState) => void;
  placeholder?: string;
  queryInterface?: QueryInterfaceType;
  /**
   * If provided, saves and displays recent searches of the given type.
   */
  recentSearches?: SavedSearchType;
}

function ActionButtons() {
  const {dispatch, handleSearch, disabled} = useSearchQueryBuilder();

  if (disabled) {
    return null;
  }

  return (
    <ButtonsWrapper>
      <ActionButton
        aria-label={t('Clear search query')}
        size="zero"
        icon={<IconClose />}
        borderless
        onClick={() => {
          dispatch({type: 'CLEAR'});
          handleSearch('');
        }}
      />
    </ButtonsWrapper>
  );
}

export function SearchQueryBuilder({
  className,
  disabled = false,
  disallowLogicalOperators,
  disallowFreeText,
  disallowUnsupportedFilters,
  disallowWildcard,
  invalidMessages,
  label,
  initialQuery,
  fieldDefinitionGetter = getFieldDefinition,
  filterKeys,
  filterKeyMenuWidth = 360,
  filterKeySections,
  getTagValues,
  onChange,
  onSearch,
  onBlur,
  placeholder,
  queryInterface = QueryInterfaceType.TOKENIZED,
  recentSearches,
  searchSource,
}: SearchQueryBuilderProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const {state, dispatch} = useQueryBuilderState({
    initialQuery,
    getFieldDefinition: fieldDefinitionGetter,
    disabled,
  });

  const parsedQuery = useMemo(
    () =>
      parseQueryBuilderValue(state.query, fieldDefinitionGetter, {
        disallowFreeText,
        disallowLogicalOperators,
        disallowUnsupportedFilters,
        disallowWildcard,
        filterKeys,
        invalidMessages,
      }),
    [
      state.query,
      fieldDefinitionGetter,
      disallowFreeText,
      disallowLogicalOperators,
      disallowUnsupportedFilters,
      disallowWildcard,
      filterKeys,
      invalidMessages,
    ]
  );

  useEffectAfterFirstRender(() => {
    dispatch({type: 'UPDATE_QUERY', query: initialQuery});
  }, [dispatch, initialQuery]);

  const previousQuery = usePrevious(state.query);
  useEffectAfterFirstRender(() => {
    if (previousQuery !== state.query) {
      onChange?.(state.query, {parsedQuery, queryIsValid: queryIsValid(parsedQuery)});
    }
  }, [onChange, state.query, previousQuery, parsedQuery]);

  const handleSearch = useHandleSearch({
    parsedQuery,
    recentSearches,
    searchSource,
    onSearch,
  });
  const {width} = useDimensions({elementRef: wrapperRef});
  const size = width < 600 ? ('small' as const) : ('normal' as const);

  const contextValue = useMemo(() => {
    return {
      ...state,
      disabled,
      parsedQuery,
      filterKeySections: filterKeySections ?? [],
      filterKeyMenuWidth,
      filterKeys,
      getTagValues,
      getFieldDefinition: fieldDefinitionGetter,
      dispatch,
      onSearch,
      wrapperRef,
      handleSearch,
      placeholder,
      recentSearches,
      searchSource,
      size,
    };
  }, [
    state,
    disabled,
    parsedQuery,
    filterKeySections,
    filterKeyMenuWidth,
    filterKeys,
    getTagValues,
    fieldDefinitionGetter,
    dispatch,
    onSearch,
    handleSearch,
    placeholder,
    recentSearches,
    searchSource,
    size,
  ]);

  return (
    <SearchQueryBuilerContext.Provider value={contextValue}>
      <PanelProvider>
        <Wrapper
          className={className}
          onBlur={() =>
            onBlur?.(state.query, {parsedQuery, queryIsValid: queryIsValid(parsedQuery)})
          }
          ref={wrapperRef}
          aria-disabled={disabled}
        >
          {size !== 'small' && <PositionedSearchIcon size="sm" />}
          {!parsedQuery || queryInterface === QueryInterfaceType.TEXT ? (
            <PlainTextQueryInput label={label} />
          ) : (
            <TokenizedQueryGrid label={label} />
          )}
          {size !== 'small' && <ActionButtons />}
        </Wrapper>
      </PanelProvider>
    </SearchQueryBuilerContext.Provider>
  );
}

const Wrapper = styled('div')`
  ${inputStyles}
  min-height: 38px;
  padding: 0;
  height: auto;
  width: 100%;
  position: relative;
  font-size: ${p => p.theme.fontSizeMedium};
  cursor: text;

  :focus-within {
    border: 1px solid ${p => p.theme.focusBorder};
    box-shadow: 0 0 0 1px ${p => p.theme.focusBorder};
  }
`;

const ButtonsWrapper = styled('div')`
  position: absolute;
  right: 9px;
  top: 9px;
  display: flex;
  align-items: center;
  gap: ${p => p.theme.space(0.5)};
`;

const ActionButton = styled(Button)`
  color: ${p => p.theme.subText};
`;

const PositionedSearchIcon = styled(IconSearch)`
  color: ${p => p.theme.subText};
  position: absolute;
  left: ${p => p.theme.space(1.5)};
  top: ${p => p.theme.space(0.75)};
  height: 22px;
`;
