from __future__ import annotations

import logging

__all__ = ["FeatureManager"]

import abc
from collections import defaultdict
from collections.abc import Iterable, Mapping, MutableMapping, MutableSet, Sequence
from typing import TYPE_CHECKING, Any

import sentry_sdk
from django.conf import settings

from sentry.options import FLAG_AUTOMATOR_MODIFIABLE, register
from sentry.utils import metrics
from sentry.utils.types import Dict

from .base import Feature, FeatureHandlerStrategy
from .exceptions import FeatureNotRegistered

if TYPE_CHECKING:
    from sentry.features.handler import FeatureHandler
    from sentry.models.organization import Organization
    from sentry.models.project import Project
    from sentry.models.user import User


class RegisteredFeatureManager:
    """
    Feature functions that are built around the need to register feature
    handlers

    TODO: Once features have been audited and migrated to the entity
    handler, remove this class entirely
    """

    def __init__(self) -> None:
        self._handler_registry: MutableMapping[str, list[FeatureHandler]] = defaultdict(list)

    def add_handler(self, handler: FeatureHandler) -> None:
        """
        Register a feature handler.

        The passed object is a FeatureHandler that is associated with all
        features defined in the ``handler.features`` property.
        """
        for feature_name in handler.features:
            self._handler_registry[feature_name].append(handler)

    def _get_handler(self, feature: Feature, actor: User) -> bool | None:
        for handler in self._handler_registry[feature.name]:
            rv = handler(feature, actor)
            if rv is not None:
                return rv
        return None

    @abc.abstractmethod
    def _get_feature_class(self, name: str) -> type[Feature]:
        """
        We need this abstract method on this class because the `has_for_batch()`
        method instantiates a `FeatureCheckBatch` and sets `manager` as `self`
        as a `RegisteredFeatureManager`.
        """
        raise NotImplementedError

    def has_for_batch(
        self,
        name: str,
        organization: Organization,
        objects: Sequence[Project],
        actor: User | None = None,
    ) -> Mapping[Project, bool]:
        """
        Determine in a batch if a feature is enabled.

        This applies the same procedure as ``FeatureManager.has``, but with a
        performance benefit where the objects being checked all belong to the
        same organization. The objects are entities (e.g., projects) with the
        common parent organization, as would be passed individually to ``has``.

        Feature handlers that depend only on organization attributes, and not
        on attributes of the individual objects being checked, will generally
        perform faster if this method is used in preference to ``has``.

        The return value is a dictionary with the objects as keys. Each value
        is what would be returned if the key were passed to ``has``.

        The entity handler can handle both batch project/organization
        contexts so it'll likely have an entirely different implementation
        of this functionality.

        >>> FeatureManager.has_for_batch('projects:feature', organization, [project1, project2], actor=request.user)
        """

        result = dict()
        remaining = set(objects)

        handlers = self._handler_registry[name]
        for handler in handlers:
            if not remaining:
                break

            with sentry_sdk.start_span(
                op="feature.has_for_batch.handler",
                description=f"{type(handler).__name__} ({name})",
            ) as span:
                batch_size = len(remaining)
                span.set_data("Batch Size", batch_size)
                span.set_data("Feature Name", name)
                span.set_data("Handler Type", type(handler).__name__)

                batch = FeatureCheckBatch(self, name, organization, remaining, actor)
                handler_result = handler.has_for_batch(batch)
                for obj, flag in handler_result.items():
                    if flag is not None:
                        remaining.remove(obj)
                        result[obj] = flag
                span.set_data("Flags Found", batch_size - len(remaining))

        default_flag = settings.SENTRY_FEATURES.get(name, False)
        for obj in remaining:
            result[obj] = default_flag

        return result


FLAGPOLE_OPTION_PREFIX = "feature"


# TODO: Change RegisteredFeatureManager back to object once it can be removed
class FeatureManager(RegisteredFeatureManager):
    def __init__(self) -> None:
        super().__init__()
        self._feature_registry: MutableMapping[str, type[Feature]] = {}
        self.entity_features: MutableSet[str] = set()
        self.option_features: MutableSet[str] = set()
        self.flagpole_features: MutableSet[str] = set()
        self._entity_handler: FeatureHandler | None = None

    def all(self, feature_type: type[Feature] = Feature) -> Mapping[str, type[Feature]]:
        """
        Get a mapping of feature name -> feature class, optionally specific to a
        particular feature type.
        """
        return {k: v for k, v in self._feature_registry.items() if issubclass(v, feature_type)}

    def add(
        self,
        name: str,
        cls: type[Feature] = Feature,
        entity_feature_strategy: bool | FeatureHandlerStrategy = False,
        default: bool = False,
    ) -> None:
        """
        Register a feature.

        The passed class is a Feature container object, which can be used
        to encapsulate the context associated with a feature.

        >>> FeatureManager.has('my:feature', actor=request.user)

        Features that use flagpole will have an option automatically registered.
        """
        entity_feature_strategy = self._shim_feature_strategy(entity_feature_strategy)

        if entity_feature_strategy == FeatureHandlerStrategy.REMOTE:
            if name.startswith("users:"):
                raise NotImplementedError("User flags not allowed with entity_feature=True")
            self.entity_features.add(name)
        if entity_feature_strategy == FeatureHandlerStrategy.OPTIONS:
            if name.startswith("users:"):
                raise NotImplementedError(
                    "OPTIONS feature handler strategy only supports organizations (for now)"
                )
            self.option_features.add(name)

        is_external_flag = (
            entity_feature_strategy == FeatureHandlerStrategy.FLAGPOLE
            or entity_feature_strategy == FeatureHandlerStrategy.REMOTE
        )

        # Register all remote and flagpole features with options automator,
        # so long as they haven't already been registered. This will allow
        # us to backfill and cut over to Flagpole without interruptions.
        if is_external_flag and name not in self.flagpole_features:
            self.flagpole_features.add(name)
            # Set a default of {} to ensure the feature evaluates to None when checked
            feature_option_name = f"{FLAGPOLE_OPTION_PREFIX}.{name}"
            register(feature_option_name, type=Dict, default={}, flags=FLAG_AUTOMATOR_MODIFIABLE)

        if name not in settings.SENTRY_FEATURES:
            settings.SENTRY_FEATURES[name] = default

        self._feature_registry[name] = cls

    def _get_feature_class(self, name: str) -> type[Feature]:
        try:
            return self._feature_registry[name]
        except KeyError:
            raise FeatureNotRegistered(name)

    def get(self, name: str, *args: Any, **kwargs: Any) -> Feature:
        """
        Lookup a registered feature context scope given the feature name.

        >>> FeatureManager.get('my:feature', actor=request.user)
        """
        cls = self._get_feature_class(name)
        return cls(name, *args, **kwargs)

    def add_entity_handler(self, handler: FeatureHandler) -> None:
        """
        Registers a handler that doesn't require a feature name match
        """
        self._entity_handler = handler

    def has(self, name: str, *args: Any, skip_entity: bool | None = False, **kwargs: Any) -> bool:
        """
        Determine if a feature is enabled. If a handler returns None, then the next
        mechanism is used for feature checking.

        Features are checked in the following order:

        1. Execute registered feature handlers. Any
           ``feature.handler.FeatureHandler`` objects that have been registered
           with ``add_handler` will be executed in the order they are declared.

           When each handler is executed, should the handler return None
           instead of True or False (feature enabled / disabled), the
           next registered feature handler will be executed.

        2. Check the entity handler, this handler doesn't check the handler registry,
           and eventually the entity handler will replace the need to register handlers
           for each feature.

           TODO: When this replaces registered feature handlers, the functions for
           registering and retrieving handlers should all be removed

        3. The default configuration of the feature. This can be located in
           sentry.conf.server.SENTRY_FEATURES.

        Depending on the Feature class, additional arguments may need to be
        provided to assign organization or project context to the feature.

        >>> FeatureManager.has('organizations:feature', organization, actor=request.user)

        """
        sample_rate = 0.01
        try:
            with metrics.timer("features.has", tags={"feature": name}, sample_rate=sample_rate):
                actor = kwargs.pop("actor", None)
                feature = self.get(name, *args, **kwargs)

                # Check registered feature handlers
                rv = self._get_handler(feature, actor)
                if rv is not None:
                    metrics.incr(
                        "feature.has.result",
                        tags={"feature": name, "result": rv},
                        sample_rate=sample_rate,
                    )
                    return rv

                if self._entity_handler and not skip_entity:
                    rv = self._entity_handler.has(feature, actor)
                    if rv is not None:
                        metrics.incr(
                            "feature.has.result",
                            tags={"feature": name, "result": rv},
                            sample_rate=sample_rate,
                        )
                        return rv

                rv = settings.SENTRY_FEATURES.get(feature.name, False)
                if rv is not None:
                    metrics.incr(
                        "feature.has.result",
                        tags={"feature": name, "result": rv},
                        sample_rate=sample_rate,
                    )
                    return rv

                # Features are by default disabled if no plugin or default enables them
                metrics.incr(
                    "feature.has.result",
                    tags={"feature": name, "result": False},
                    sample_rate=sample_rate,
                )

                return False
        except Exception:
            logging.exception("Failed to run feature check")
            return False

    def batch_has(
        self,
        feature_names: Sequence[str],
        actor: User | None = None,
        projects: Sequence[Project] | None = None,
        organization: Organization | None = None,
    ) -> Mapping[str, Mapping[str, bool | None]] | None:
        """
        Determine if multiple features are enabled. Unhandled flags will not be in
        the results if they cannot be handled.

        Will only accept one type of feature, either all ProjectFeatures or all
        OrganizationFeatures.
        """
        if self._entity_handler:
            return self._entity_handler.batch_has(
                feature_names, actor, projects=projects, organization=organization
            )
        else:
            # Fall back to default handler if no entity handler available.
            project_features = [name for name in feature_names if name.startswith("projects:")]
            if projects and project_features:
                results: MutableMapping[str, Mapping[str, bool]] = {}
                for project in projects:
                    proj_results = results[f"project:{project.id}"] = {}
                    for feature_name in project_features:
                        proj_results[feature_name] = self.has(feature_name, project, actor=actor)
                return results

            org_features = filter(lambda name: name.startswith("organizations:"), feature_names)
            if organization and org_features:
                org_results = {}
                for feature_name in org_features:
                    org_results[feature_name] = self.has(feature_name, organization, actor=actor)
                return {f"organization:{organization.id}": org_results}

            unscoped_features = filter(
                lambda name: not name.startswith("organizations:")
                and not name.startswith("projects:"),
                feature_names,
            )
            if unscoped_features:
                unscoped_results = {}
                for feature_name in unscoped_features:
                    unscoped_results[feature_name] = self.has(feature_name, actor=actor)
                return {"unscoped": unscoped_results}
            return None

    @staticmethod
    def _shim_feature_strategy(
        entity_feature_strategy: bool | FeatureHandlerStrategy,
    ) -> FeatureHandlerStrategy:
        """
        Shim layer for old API to register a feature until all the features have been converted
        """
        if entity_feature_strategy is True:
            return FeatureHandlerStrategy.REMOTE
        elif entity_feature_strategy is False:
            return FeatureHandlerStrategy.INTERNAL
        return entity_feature_strategy


class FeatureCheckBatch:
    """
    A batch of objects to be checked for a feature flag.

    An instance of this class encapsulates a call to
    ``FeatureManager.has_for_batch``. The objects (such as projects) have a
    common parent organization.
    """

    def __init__(
        self,
        manager: RegisteredFeatureManager,
        name: str,
        organization: Organization,
        objects: Iterable[Project],
        actor: User,
    ) -> None:
        self._manager = manager
        self.feature_name = name
        self.organization = organization
        self.objects = objects
        self.actor = actor

    def get_feature_objects(self) -> Mapping[Project, Feature]:
        """
        Iterate over individual Feature objects.

        This is a fallback mode for applying a FeatureHandler that doesn't
        support checking the entire batch at once.
        """

        cls = self._manager._get_feature_class(self.feature_name)
        return {obj: cls(self.feature_name, obj) for obj in self.objects}

    @property
    def subject(self) -> Organization | User:
        return self.organization or self.actor
