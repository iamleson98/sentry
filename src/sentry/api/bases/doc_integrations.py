from __future__ import annotations

from django.http import Http404
from rest_framework.request import Request

from sentry.api.base import Endpoint
from sentry.api.bases.integration import PARANOID_GET
from sentry.api.permissions import SentryPermission, StaffPermissionMixin
from sentry.api.utils import id_or_slug_path_params_enabled
from sentry.api.validators.doc_integration import METADATA_PROPERTIES
from sentry.auth.superuser import is_active_superuser
from sentry.models.integrations.doc_integration import DocIntegration
from sentry.utils.json import JSONData
from sentry.utils.sdk import configure_scope


class DocIntegrationsPermission(SentryPermission):
    """ "
    Allows all org members to access GET as long as they have the necessary
    scopes. For item endpoints, the doc integration must be published.

    # TODO(schew2381): Remove superuser language once staff feature flag is rolled out
    Superusers can access unpublished doc integrations (GET) and also use PUT + DEL
    which endpoints which are all accessible through _admin.
    """

    scope_map = {"GET": PARANOID_GET}

    def has_permission(self, request: Request, view: object) -> bool:
        if not super().has_permission(request, view):
            return False

        # TODO(schew2381): Remove superuser check once staff feature flag is rolled out.
        # We want to allow staff through the StaffPermissionMixin instead of mixing logic here.
        if is_active_superuser(request) or request.method == "GET":
            return True

        return False

    def has_object_permission(
        self, request: Request, view: object, doc_integration: DocIntegration
    ) -> bool:
        if not hasattr(request, "user") or not request.user:
            return False

        # TODO(schew2381): Remove superuser check once staff feature flag is rolled out.
        # We want to allow staff through the StaffPermissionMixin instead of mixing logic here.
        if is_active_superuser(request):
            return True

        if not doc_integration.is_draft and request.method == "GET":
            return True

        return False


class DocIntegrationsAndStaffPermission(StaffPermissionMixin, DocIntegrationsPermission):
    """Allows staff to to access doc integration endpoints."""

    pass


class DocIntegrationsBaseEndpoint(Endpoint):
    """
    Base endpoint used for doc integration collection endpoints.
    """

    permission_classes = (DocIntegrationsAndStaffPermission,)

    def generate_incoming_metadata(self, request: Request) -> JSONData:
        return {k: v for k, v in request.json_body.items() if k in METADATA_PROPERTIES}


class DocIntegrationBaseEndpoint(DocIntegrationsBaseEndpoint):
    """
    Base endpoint used for doc integration item endpoints.
    """

    def convert_args(
        self, request: Request, doc_integration_id_or_slug: str | int, *args, **kwargs
    ):
        try:
            if id_or_slug_path_params_enabled(self.convert_args.__qualname__):
                doc_integration = DocIntegration.objects.get(
                    slug__id_or_slug=doc_integration_id_or_slug
                )
            else:
                doc_integration = DocIntegration.objects.get(slug=doc_integration_id_or_slug)
        except DocIntegration.DoesNotExist:
            raise Http404

        self.check_object_permissions(request, doc_integration)

        with configure_scope() as scope:
            scope.set_tag("doc_integration", doc_integration.slug)

        kwargs["doc_integration"] = doc_integration
        return (args, kwargs)
