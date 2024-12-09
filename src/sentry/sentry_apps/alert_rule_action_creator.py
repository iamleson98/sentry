from collections.abc import Mapping
from dataclasses import dataclass, field
from typing import Any

from django.db import router, transaction
from django.utils.functional import cached_property

from sentry.coreapi import APIError
from sentry.exceptions import SentryAppIntegratorError
from sentry.sentry_apps.external_requests.alert_rule_action_requester import (
    AlertRuleActionRequester,
)
from sentry.sentry_apps.models.sentry_app_component import SentryAppComponent
from sentry.sentry_apps.models.sentry_app_installation import SentryAppInstallation


@dataclass
class AlertRuleActionCreator:
    install: SentryAppInstallation
    fields: list[Mapping[str, Any]] = field(default_factory=list)

    def run(self) -> None:
        with transaction.atomic(router.db_for_write(SentryAppComponent)):
            uri = self._fetch_sentry_app_uri()
            self._make_external_request(uri)

    def _fetch_sentry_app_uri(self):
        component = SentryAppComponent.objects.get(
            type="alert-rule-action", sentry_app=self.sentry_app
        )
        settings = component.schema.get("settings", {})
        return settings.get("uri")

    def _make_external_request(self, uri=None) -> None:
        if uri is None:
            raise SentryAppIntegratorError(APIError("Sentry App request url not found"))
        AlertRuleActionRequester(
            install=self.install,
            uri=uri,
            fields=self.fields,
        ).run()

    @cached_property
    def sentry_app(self):
        return self.install.sentry_app
