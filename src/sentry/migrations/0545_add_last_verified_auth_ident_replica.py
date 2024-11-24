# Generated by Django 3.2.20 on 2023-09-06 05:06

import django.utils.timezone
from django.db import migrations, models

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

    allow_run_sql = True

    dependencies = [
        ("sentry", "0544_remove_groupsubscription_columns"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(
                    """
                    ALTER TABLE "sentry_authidentityreplica" ADD COLUMN IF NOT EXISTS "last_verified" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();
                    """,
                    reverse_sql="""
                    ALTER TABLE "sentry_authidentityreplica" DROP COLUMN "last_verified";
                    """,
                    hints={"tables": ["sentry_authidentityreplica"]},
                ),
            ],
            state_operations=[
                migrations.AddField(
                    model_name="authidentityreplica",
                    name="last_verified",
                    field=models.DateTimeField(default=django.utils.timezone.now),
                ),
            ],
        )
    ]
