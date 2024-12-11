from sentry.workflow_engine.handlers.detector import DetectorEvaluationResult
from sentry.workflow_engine.models import DataPacket, Detector
from sentry.workflow_engine.processors import process_data_sources, process_detectors
from sentry.workflow_engine.types import DetectorGroupKey


def process_data_packets(
    data_packets: list[DataPacket], query_type: str
) -> list[tuple[Detector, dict[DetectorGroupKey, DetectorEvaluationResult]]]:
    """
    This method ties the two main pre-processing methods together to process
    the incoming data and create issue occurrences.
    """
    processed_sources = process_data_sources(data_packets, query_type)

    results: list[tuple[Detector, dict[DetectorGroupKey, DetectorEvaluationResult]]] = []
    for data_packet, detectors in processed_sources:
        detector_result = process_detectors(data_packet, detectors)
        results.append(detector_result)

    return results
