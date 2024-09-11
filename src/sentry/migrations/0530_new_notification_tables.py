# Generated by Django 3.2.20 on 2023-08-15 17:22

import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models

import sentry.db.models.fields.bounded
import sentry.db.models.fields.foreignkey
import sentry.db.models.fields.hybrid_cloud_foreign_key
from sentry.new_migrations.migrations import CheckedMigration


class Migration(CheckedMigration):
    # This flag is used to mark that a migration shouldn't be automatically run in production. For
    # the most part, this should only be used for operations where it's safe to run the migration
    # after your code has deployed. So this should not be used for most operations that alter the
    # schema of a table.
    # Here are some things that make sense to mark as post deployment:
    # - Large data migrations. Typically we want these to be run manually by ops so that they can
    #   be monitored and not block the deploy for a long period of time while they run.
    # - Adding indexes to large tables. Since this can take a long time, we'd generally prefer to
    #   have ops run this and not block the deploy. Note that while adding an index is a schema
    #   change, it's completely safe to run the operation after the code has deployed.
    is_post_deployment = False

    dependencies = [
        ("sentry", "0529_remove_pagerduty_service"),
    ]

    operations = [
        migrations.CreateModel(
            name="NotificationSettingProvider",
            fields=[
                (
                    "id",
                    sentry.db.models.fields.bounded.BoundedBigAutoField(
                        primary_key=True, serialize=False
                    ),
                ),
                ("date_updated", models.DateTimeField(default=django.utils.timezone.now)),
                ("date_added", models.DateTimeField(default=django.utils.timezone.now, null=True)),
                ("scope_type", models.CharField(max_length=32)),
                ("scope_identifier", sentry.db.models.fields.bounded.BoundedBigIntegerField()),
                (
                    "team_id",
                    sentry.db.models.fields.hybrid_cloud_foreign_key.HybridCloudForeignKey(
                        "sentry.Team", db_index=True, null=True, on_delete="CASCADE"
                    ),
                ),
                ("type", models.CharField(max_length=32)),
                ("value", models.CharField(max_length=32)),
                ("provider", models.CharField(max_length=32)),
                (
                    "user",
                    sentry.db.models.fields.foreignkey.FlexibleForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "db_table": "sentry_notificationsettingprovider",
            },
        ),
        migrations.CreateModel(
            name="NotificationSettingOption",
            fields=[
                (
                    "id",
                    sentry.db.models.fields.bounded.BoundedBigAutoField(
                        primary_key=True, serialize=False
                    ),
                ),
                ("date_updated", models.DateTimeField(default=django.utils.timezone.now)),
                ("date_added", models.DateTimeField(default=django.utils.timezone.now, null=True)),
                ("scope_type", models.CharField(max_length=32)),
                ("scope_identifier", sentry.db.models.fields.bounded.BoundedBigIntegerField()),
                (
                    "team_id",
                    sentry.db.models.fields.hybrid_cloud_foreign_key.HybridCloudForeignKey(
                        "sentry.Team", db_index=True, null=True, on_delete="CASCADE"
                    ),
                ),
                ("type", models.CharField(max_length=32)),
                ("value", models.CharField(max_length=32)),
                (
                    "user",
                    sentry.db.models.fields.foreignkey.FlexibleForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "db_table": "sentry_notificationsettingoption",
            },
        ),
        migrations.AddConstraint(
            model_name="notificationsettingprovider",
            constraint=models.CheckConstraint(
                condition=models.Q(
                    models.Q(("team_id__isnull", False), ("user_id__isnull", True)),
                    models.Q(("team_id__isnull", True), ("user_id__isnull", False)),
                    _connector="OR",
                ),
                name="notification_setting_provider_team_or_user_check",
            ),
        ),
        migrations.AlterUniqueTogether(
            name="notificationsettingprovider",
            unique_together={
                ("scope_type", "scope_identifier", "user_id", "team_id", "provider", "type")
            },
        ),
        migrations.AddConstraint(
            model_name="notificationsettingoption",
            constraint=models.CheckConstraint(
                condition=models.Q(
                    models.Q(("team_id__isnull", False), ("user_id__isnull", True)),
                    models.Q(("team_id__isnull", True), ("user_id__isnull", False)),
                    _connector="OR",
                ),
                name="notification_setting_option_team_or_user_check",
            ),
        ),
        migrations.AlterUniqueTogether(
            name="notificationsettingoption",
            unique_together={("scope_type", "scope_identifier", "user_id", "team_id", "type")},
        ),
    ]
