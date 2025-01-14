# Generated by Django 5.1.5 on 2025-01-15 21:11

import django.db.models.deletion
import django.utils.timezone
import sentry.db.models.fields.bounded
import sentry.db.models.fields.foreignkey
import sentry.models.groupsearchview
from django.db import migrations, models

from sentry.new_migrations.migrations import CheckedMigration


class Migration(CheckedMigration):
    # This flag is used to mark that a migration shouldn't be automatically run in production.
    # This should only be used for operations where it's safe to run the migration after your
    # code has deployed. So this should not be used for most operations that alter the schema
    # of a table.
    # Here are some things that make sense to mark as post deployment:
    # - Large data migrations. Typically we want these to be run manually so that they can be
    #   monitored and not block the deploy for a long period of time while they run.
    # - Adding indexes to large tables. Since this can take a long time, we'd generally prefer to
    #   run this outside deployments so that we don't block them. Note that while adding an index
    #   is a schema change, it's completely safe to run the operation after the code has deployed.
    # Once deployed, run these manually via: https://develop.sentry.dev/database-migrations/#migration-deployment

    is_post_deployment = False

    dependencies = [
        ("sentry", "0816_add_timestamp_to_group_tombstone"),
    ]

    operations = [
        migrations.AddField(
            model_name="groupsearchview",
            name="is_my_projects",
            field=models.BooleanField(db_default=True),
        ),
        migrations.AddField(
            model_name="groupsearchview",
            name="time_filters",
            field=models.JSONField(db_default={"period": "14d"}),
        ),
        migrations.CreateModel(
            name="GroupSearchViewEnvironment",
            fields=[
                (
                    "id",
                    sentry.db.models.fields.bounded.BoundedBigAutoField(
                        primary_key=True, serialize=False
                    ),
                ),
                ("date_updated", models.DateTimeField(auto_now=True)),
                ("date_added", models.DateTimeField(auto_now_add=True)),
                (
                    "environment",
                    sentry.db.models.fields.foreignkey.FlexibleForeignKey(
                        on_delete=django.db.models.deletion.CASCADE, to="sentry.environment"
                    ),
                ),
                (
                    "group_search_view",
                    sentry.db.models.fields.foreignkey.FlexibleForeignKey(
                        on_delete=django.db.models.deletion.CASCADE, to="sentry.groupsearchview"
                    ),
                ),
            ],
            options={
                "db_table": "sentry_groupsearchviewenvironment",
                "unique_together": {("group_search_view", "environment")},
            },
        ),
        migrations.AddField(
            model_name="groupsearchview",
            name="environments",
            field=models.ManyToManyField(
                through="sentry.GroupSearchViewEnvironment", to="sentry.environment"
            ),
        ),
        migrations.CreateModel(
            name="GroupSearchViewProject",
            fields=[
                (
                    "id",
                    sentry.db.models.fields.bounded.BoundedBigAutoField(
                        primary_key=True, serialize=False
                    ),
                ),
                ("date_updated", models.DateTimeField(auto_now=True)),
                ("date_added", models.DateTimeField(auto_now_add=True)),
                (
                    "group_search_view",
                    sentry.db.models.fields.foreignkey.FlexibleForeignKey(
                        on_delete=django.db.models.deletion.CASCADE, to="sentry.groupsearchview"
                    ),
                ),
                (
                    "project",
                    sentry.db.models.fields.foreignkey.FlexibleForeignKey(
                        on_delete=django.db.models.deletion.CASCADE, to="sentry.project"
                    ),
                ),
            ],
            options={
                "db_table": "sentry_groupsearchviewproject",
                "unique_together": {("group_search_view", "project")},
            },
        ),
        migrations.AddField(
            model_name="groupsearchview",
            name="projects",
            field=models.ManyToManyField(
                through="sentry.GroupSearchViewProject", to="sentry.project"
            ),
        ),
    ]
