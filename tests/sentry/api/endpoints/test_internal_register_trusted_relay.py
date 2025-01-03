from datetime import datetime, timezone

from django.urls import reverse

from sentry.models.options.organization_option import OrganizationOption
from sentry.models.orgauthtoken import OrgAuthToken
from sentry.silo.base import SiloMode
from sentry.testutils.cases import APITestCase
from sentry.testutils.silo import assume_test_silo_mode, region_silo_test
from sentry.utils.security.orgauthtoken_token import generate_token, hash_token


@region_silo_test
class InternalRegisterTrustedRelayTest(APITestCase):
    endpoint = "sentry-api-0-internal-register-trusted-relay"

    def setUp(self):
        super().setUp()

        self.login_as(user=self.user)
        self.org = self.create_organization(owner=self.user)
        self.url = reverse(self.endpoint)

        self.valid_token_str = self.generate_org_token(self.org.id, self.org.slug)
        self.valid_payload = {
            "publicKey": "EfuxZmOtiknvFJpmITKaSnX2fzkZoH612nrjZJnbbm8",
            "name": "relay_test",
            "description": "Test relay description",
        }

    def generate_org_token(self, org_id, org_slug):
        token = generate_token(org_slug, "")
        with assume_test_silo_mode(SiloMode.CONTROL):
            OrgAuthToken.objects.create(
                organization_id=org_id,
                name="test token",
                token_hashed=hash_token(token),
                token_last_characters=token[-4:],
                scope_list=["org:ci"],  # Required scope for relay operations
                date_last_used=None,
            )

        return token

    def test_post_with_no_token(self):
        """
        Test that attempting to register a relay without an auth token
        """
        response = self.client.post(self.url, self.valid_payload)
        assert response.status_code == 401

    def test_post_without_relay_feature(self):
        """
        Test that attempting to register a relay without the relay feature returns 400
        """
        with self.feature({"organizations:relay": False}):
            response = self.client.post(
                self.url, self.valid_payload, HTTP_AUTHORIZATION=f"Bearer {self.valid_token_str}"
            )
            assert response.status_code == 400
            assert (
                response.data["detail"]
                == "The organization is not enabled to use an external Relay."
            )

    def test_post_with_invalid_data(self):
        """
        Test that attempting to register a relay with invalid data returns 400
        """
        with self.feature({"organizations:relay": True}):
            response = self.client.post(
                self.url, {"invalid": "data"}, HTTP_AUTHORIZATION=f"Bearer {self.valid_token_str}"
            )
            assert response.status_code == 400

    def test_successful_registration_new_relay(self):
        """
        Test successful registration of a new relay when no relays exist
        """
        with self.feature({"organizations:relay": True}):
            response = self.client.post(
                self.url, self.valid_payload, HTTP_AUTHORIZATION=f"Bearer {self.valid_token_str}"
            )

            assert response.status_code == 201

            # Verify response data
            assert response.data["public_key"] == self.valid_payload["publicKey"]
            assert response.data["name"] == self.valid_payload["name"]
            assert response.data["description"] == self.valid_payload["description"]
            assert "created" in response.data
            assert "last_modified" in response.data

            # Verify data was saved correctly
            option = OrganizationOption.objects.get(
                organization=self.org, key="sentry:trusted-relays"
            )
            assert len(option.value) == 1
            assert option.value[0]["public_key"] == self.valid_payload["publicKey"]

    def test_successful_registration_existing_relays(self):
        """
        Test successful registration of a relay when other relays already exist
        """
        # Create an existing relay
        existing_relay = {
            "public_key": "cKxTP2O9y3OLWUHw40xBm8VT3ybchek-MtIbUX-eZ1M",
            "name": "existing_relay",
            "description": "Existing relay",
            "created": datetime.now(timezone.utc).isoformat(),
            "last_modified": datetime.now(timezone.utc).isoformat(),
        }
        OrganizationOption.objects.set_value(
            organization=self.org, key="sentry:trusted-relays", value=[existing_relay]
        )

        with self.feature({"organizations:relay": True}):
            response = self.client.post(
                self.url, self.valid_payload, HTTP_AUTHORIZATION=f"Bearer {self.valid_token_str}"
            )

            assert response.status_code == 201

            # Verify data was saved correctly
            option = OrganizationOption.objects.get(
                organization=self.org, key="sentry:trusted-relays"
            )
            assert len(option.value) == 2
            assert option.value[0]["public_key"] == existing_relay["public_key"]
            assert option.value[1]["public_key"] == self.valid_payload["publicKey"]

    def test_successful_update_existing_relay(self):
        """
        Test successful update of an existing relay
        """
        # Create an existing relay
        existing_relay = {
            "public_key": self.valid_payload["publicKey"],
            "name": "old_name",
            "description": "Old description",
            "created": datetime.now(timezone.utc).isoformat(),
            "last_modified": datetime.now(timezone.utc).isoformat(),
        }
        OrganizationOption.objects.set_value(
            organization=self.org, key="sentry:trusted-relays", value=[existing_relay]
        )

        with self.feature({"organizations:relay": True}):
            response = self.client.post(
                self.url, self.valid_payload, HTTP_AUTHORIZATION=f"Bearer {self.valid_token_str}"
            )

            assert response.status_code == 201

            # Verify data was updated correctly
            option = OrganizationOption.objects.get(
                organization=self.org, key="sentry:trusted-relays"
            )
            assert len(option.value) == 1
            updated_relay = option.value[0]
            assert updated_relay["public_key"] == self.valid_payload["publicKey"]
            assert updated_relay["name"] == self.valid_payload["name"]
            assert updated_relay["description"] == self.valid_payload["description"]
            assert (
                updated_relay["created"] == existing_relay["created"]
            )  # Should preserve created date
            assert (
                updated_relay["last_modified"] != existing_relay["last_modified"]
            )  # Should be updated

    def test_successful_registration_multiple_relays(self):
        """
        Test successful registration and update of multiple relays
        """
        # Create two existing relays
        existing_relays = [
            {
                "public_key": "cKxTP2O9y3OLWUHw40xBm8VT3ybchek-MtIbUX-eZ1M",
                "name": "existing_relay1",
                "description": "Existing relay 1",
                "created": datetime.now(timezone.utc).isoformat(),
                "last_modified": datetime.now(timezone.utc).isoformat(),
            },
            {
                "public_key": "5eWj6p7Boesv4sYipv4k7-MoqqMwtp1F4WN9bGB2P8U",
                "name": "existing_relay2",
                "description": "Existing relay 2",
                "created": datetime.now(timezone.utc).isoformat(),
                "last_modified": datetime.now(timezone.utc).isoformat(),
            },
        ]
        OrganizationOption.objects.set_value(
            organization=self.org, key="sentry:trusted-relays", value=existing_relays
        )

        with self.feature({"organizations:relay": True}):
            # Add a new relay
            response = self.client.post(
                self.url, self.valid_payload, HTTP_AUTHORIZATION=f"Bearer {self.valid_token_str}"
            )
            assert response.status_code == 201

            # Verify all relays are present
            option = OrganizationOption.objects.get(
                organization=self.org, key="sentry:trusted-relays"
            )
            assert len(option.value) == 3
            assert option.value[0]["public_key"] == "cKxTP2O9y3OLWUHw40xBm8VT3ybchek-MtIbUX-eZ1M"
            assert option.value[1]["public_key"] == "5eWj6p7Boesv4sYipv4k7-MoqqMwtp1F4WN9bGB2P8U"
            assert option.value[2]["public_key"] == self.valid_payload["publicKey"]

            # Update an existing relay
            update_payload = {
                "publicKey": "cKxTP2O9y3OLWUHw40xBm8VT3ybchek-MtIbUX-eZ1M",
                "name": "updated_relay1",
                "description": "Updated relay 1",
            }
            response = self.client.post(
                self.url, update_payload, HTTP_AUTHORIZATION=f"Bearer {self.valid_token_str}"
            )
            assert response.status_code == 201

            # Verify the update
            option = OrganizationOption.objects.get(
                organization=self.org, key="sentry:trusted-relays"
            )
            assert len(option.value) == 3
            updated_relay = next(
                r
                for r in option.value
                if r["public_key"] == "cKxTP2O9y3OLWUHw40xBm8VT3ybchek-MtIbUX-eZ1M"
            )
            assert updated_relay["name"] == "updated_relay1"
            assert updated_relay["description"] == "Updated relay 1"
