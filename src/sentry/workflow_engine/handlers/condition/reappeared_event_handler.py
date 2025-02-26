from typing import Any

from sentry.workflow_engine.models.data_condition import Condition
from sentry.workflow_engine.registry import condition_handler_registry
from sentry.workflow_engine.types import DataConditionHandler, DataConditionHandlerType, WorkflowJob


@condition_handler_registry.register(Condition.REAPPEARED_EVENT)
class ReappearedEventConditionHandler(DataConditionHandler[WorkflowJob]):
    type = DataConditionHandlerType.WORKFLOW_TRIGGER

    @staticmethod
    def evaluate_value(job: WorkflowJob, comparison: Any) -> bool:
        has_reappeared = job.get("has_reappeared")
        if has_reappeared is None:
            return False

        return has_reappeared == comparison
