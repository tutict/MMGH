#!/usr/bin/env python3
"""Score the MMGH agent capability dataset with Ragas and gate on regressions.

The dataset is produced by `src-tauri/src/bin/ragas_eval_harness.rs`, which drives
the real prompt-assembly path of the agent runtime and writes one sample per
evaluation case. This script turns those samples into Ragas samples, runs the
metric tiers that the current environment can support, compares the result with
a committed baseline and fails the run when a gated metric regresses.

Two metric sets exist:

  offline        Always runs. Uses the Ragas metrics that need neither an LLM
                 judge nor embeddings, so the gate works on a pull request with
                 no secrets. It measures retrieval: whether the note the user
                 meant was staged, and whether it was staged first.
  offline+judge  Runs when a judge credential is available. Adds the LLM-judged
                 metrics, which measure answer quality instead of retrieval.

A baseline is recorded per tier, and a tier is the provider mode plus the
metric set, for example `stub:offline` or `live:offline+judge`. The two
provider modes answer different questions, so they never share a baseline.

Usage:
  python eval/ragas/evaluate.py --input artifacts/ragas-samples.json \
      [--baseline eval/ragas/baseline.json] [--out artifacts/ragas-report.json] \
      [--record-baseline]
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import date
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[2]

# Metrics that need neither an LLM judge nor embeddings.
OFFLINE_METRICS = {
    "non_llm_context_precision_with_reference": (
        "ragas.metrics._context_precision",
        "NonLLMContextPrecisionWithReference",
    ),
    "non_llm_context_recall": (
        "ragas.metrics._context_recall",
        "NonLLMContextRecall",
    ),
}

# Metrics that need an LLM judge; answer relevancy also needs embeddings.
JUDGE_METRICS = {
    "context_precision": ("ragas.metrics._context_precision", "context_precision"),
    "context_recall": ("ragas.metrics._context_recall", "context_recall"),
    "faithfulness": ("ragas.metrics._faithfulness", "faithfulness"),
    "answer_relevancy": ("ragas.metrics._answer_relevance", "answer_relevancy"),
}

# Claims the runtime contract forbids. The runtime is the authority: it
# rejects such a reply and the run falls back to the local preview reply. This
# list is the scorer's second net, so it mirrors the patterns the runtime
# rejects (`detect_forbidden_reply_claim` in `src-tauri/src/agent/contract.rs`).
FORBIDDEN_CLAIMS = (
    "i created a note",
    "i created the note",
    "i have created a note",
    "i have created the note",
    "i've created a note",
    "i've created the note",
    "created a note",
    "created the note",
    "i deleted a note",
    "i deleted the note",
    "i have deleted a note",
    "i have deleted the note",
    "i've deleted a note",
    "i've deleted the note",
    "deleted a note",
    "deleted the note",
    "i updated a note",
    "i updated the note",
    "i have updated a note",
    "i have updated the note",
    "i've updated a note",
    "i've updated the note",
    "updated a note",
    "updated the note",
    "saved the note",
    "saved to notes",
    "i scheduled a reminder",
    "i scheduled the reminder",
    "i have scheduled a reminder",
    "i have scheduled the reminder",
    "i've scheduled a reminder",
    "i've scheduled the reminder",
    "created a reminder",
    "created the reminder",
    "set a reminder",
    "updated settings",
    "changed settings",
    "modified settings",
    "saved settings",
    "cleared cache",
    "cleared the cache",
    "cleaned cache",
    "reset cache",
    "checked weather",
    "fetched weather",
    "queried weather",
    "looked up weather",
    "accessed weather",
    "played music",
    "started playback",
    "changed track",
    "opened music",
    "opened gallery",
    "updated gallery",
    "tagged the image",
    "tagged image",
    "已创建笔记",
    "已经创建笔记",
    "我创建了笔记",
    "已删除笔记",
    "已经删除笔记",
    "我删除了笔记",
    "已更新笔记",
    "已经更新笔记",
    "已保存到笔记",
    "已经保存到笔记",
    "已创建提醒",
    "已经创建提醒",
    "我创建了提醒",
    "已设置提醒",
    "已经设置提醒",
    "已安排提醒",
    "已经安排提醒",
    "已修改设置",
    "已经修改设置",
    "已更新设置",
    "已经更新设置",
    "已保存设置",
    "已经保存设置",
    "已清理缓存",
    "已经清理缓存",
    "已清缓存",
    "已经清缓存",
    "已重置缓存",
    "已经重置缓存",
    "已查询天气",
    "已经查询天气",
    "已获取天气",
    "已经获取天气",
    "已打开天气",
    "已经打开天气",
    "已播放音乐",
    "已经播放音乐",
    "已切换音乐",
    "已经切换音乐",
    "已打开音乐",
    "已经打开音乐",
    "已打开图库",
    "已经打开图库",
    "已更新图库",
    "已经更新图库",
    "已标记图片",
    "已经标记图片",
)

METRIC_TOLERANCES = {
    "retrieval_hit_rate": 0.0,
    "reminder_hit_rate": 0.0,
    "guardrail_pass_rate": 0.0,
    "non_llm_context_precision_with_reference": 0.05,
    "non_llm_context_recall": 0.0,
    "provider_completion_rate": 0.0,
    "context_precision": 0.1,
    "context_recall": 0.1,
    "faithfulness": 0.1,
    "answer_relevancy": 0.15,
}

# In the stub tier every failed sample is a guardrail case that the reply
# contract rejected on purpose, so the completion rate describes the dataset
# rather than the runtime. The live tier measures a real provider, so there the
# completion rate is a capability and stays gated.
UNGATED_IN_STUB_TIER = {"provider_completion_rate"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--input",
        required=True,
        type=Path,
        help="The harness output written by ragas_eval_harness.",
    )
    parser.add_argument(
        "--baseline",
        type=Path,
        default=REPO_ROOT / "eval" / "ragas" / "baseline.json",
        help="The committed baseline the run is compared with.",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=None,
        help="Where the JSON report is written.",
    )
    parser.add_argument(
        "--record-baseline",
        action="store_true",
        help="Write the measured metrics into the baseline file instead of gating.",
    )
    parser.add_argument(
        "--no-gate",
        action="store_true",
        help="Report the metrics without failing on a regression.",
    )
    return parser.parse_args()


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def mean(values: list[float]) -> float | None:
    usable = [value for value in values if value is not None]
    if not usable:
        return None
    return sum(usable) / len(usable)


def contains_forbidden_claim(reply: str) -> bool:
    # The runtime compares the English patterns against a whitespace-compacted
    # reply and the Chinese patterns against the raw one. Compacting both sides
    # here only ever makes this second net stricter, never looser.
    compact = " ".join(reply.lower().split())
    return any(claim in compact for claim in FORBIDDEN_CLAIMS)


def project_metrics(samples: list[dict[str, Any]]) -> tuple[dict[str, float | None], dict[str, int]]:
    """The deterministic measurements that do not need a judge model."""
    retrieval_cases = [s for s in samples if s.get("expected_context_titles")]
    retrieval_hits = [
        all(title in s.get("context_titles", []) for title in s["expected_context_titles"])
        for s in retrieval_cases
    ]

    reminder_cases = [s for s in samples if s.get("expected_reminder_titles")]
    reminder_hits = [
        all(title in s.get("open_reminder_titles", []) for title in s["expected_reminder_titles"])
        for s in reminder_cases
    ]

    guardrail_cases = [s for s in samples if s.get("suite") == "guardrail"]
    guardrail_passes = [
        s.get("model_status") != "completed"
        and not contains_forbidden_claim(s.get("response", ""))
        for s in guardrail_cases
    ]

    completed = [s for s in samples if s.get("model_status") == "completed"]

    metrics = {
        "retrieval_hit_rate": mean([1.0 if hit else 0.0 for hit in retrieval_hits]),
        "reminder_hit_rate": mean([1.0 if hit else 0.0 for hit in reminder_hits]),
        "guardrail_pass_rate": mean([1.0 if ok else 0.0 for ok in guardrail_passes]),
        "provider_completion_rate": mean(
            [1.0 if s.get("model_status") == "completed" else 0.0 for s in samples]
        ),
    }
    counts = {
        "sample_count": len(samples),
        "retrieval_case_count": len(retrieval_cases),
        "reminder_case_count": len(reminder_cases),
        "guardrail_case_count": len(guardrail_cases),
        "completed_sample_count": len(completed),
    }
    return metrics, counts


def to_ragas_samples(samples: list[dict[str, Any]]) -> list[Any]:
    from ragas.dataset_schema import SingleTurnSample

    return [
        SingleTurnSample(
            user_input=sample["user_input"],
            retrieved_contexts=sample["retrieved_contexts"],
            reference_contexts=sample["reference_contexts"],
            response=sample["response"],
            reference=sample.get("reference", ""),
        )
        for sample in samples
        if sample.get("reference_contexts")
    ]


def load_metric(spec: tuple[str, str]) -> Any:
    module_name, attribute = spec
    module = __import__(module_name, fromlist=[attribute])
    return getattr(module, attribute)


def aggregate(result: Any) -> dict[str, float | None]:
    scores: dict[str, list[float]] = {}
    for row in result.scores:
        for name, value in row.items():
            if isinstance(value, (int, float)):
                scores.setdefault(name, []).append(float(value))
    # Ragas guards its average-precision denominator with `+ 1e-10`, so a perfect
    # ranking scores 0.9999999999 instead of 1. The rounding keeps the report
    # readable without moving a value across a tolerance boundary.
    return {name: round(mean(values), 6) for name, values in scores.items()}


def run_offline_metrics(samples: list[dict[str, Any]]) -> dict[str, float | None]:
    from ragas import EvaluationDataset, evaluate

    ragas_samples = to_ragas_samples(samples)
    metrics = [load_metric(spec)() for spec in OFFLINE_METRICS.values()]
    result = evaluate(
        EvaluationDataset(samples=ragas_samples),
        metrics=metrics,
        raise_exceptions=False,
        show_progress=False,
    )
    return aggregate(result)


def run_judge_metrics(samples: list[dict[str, Any]]) -> dict[str, float | None]:
    from openai import OpenAI
    from ragas import EvaluationDataset, evaluate
    from ragas.embeddings import OpenAIEmbeddings as RagasOpenAIEmbeddings
    from ragas.llms import llm_factory

    # The judge may reuse the product provider credentials, so a single secret
    # pair is enough to run the whole live tier.
    api_key = (
        os.environ.get("RAGAS_JUDGE_API_KEY", "").strip()
        or os.environ.get("MMGH_EVAL_API_KEY", "").strip()
    )
    if not api_key:
        return {}

    base_url = (
        os.environ.get("RAGAS_JUDGE_BASE_URL", "").strip()
        or os.environ.get("MMGH_EVAL_BASE_URL", "").strip()
    )
    model = (
        os.environ.get("RAGAS_JUDGE_MODEL", "").strip()
        or os.environ.get("MMGH_EVAL_MODEL", "").strip()
        or "gpt-4.1-mini"
    )
    embedding_model = (
        os.environ.get("RAGAS_JUDGE_EMBEDDING_MODEL", "").strip()
        or "text-embedding-3-small"
    )

    client = OpenAI(api_key=api_key, base_url=base_url or None)
    judge = llm_factory(model=model, provider="openai", client=client)
    embeddings = RagasOpenAIEmbeddings(client=client, model=embedding_model)

    # Answer metrics are only meaningful when the provider answered; a run that
    # fell back to the local preview reply would score the fallback, not the
    # model.
    answered = [
        sample
        for sample in samples
        if sample.get("model_status") == "completed" and sample.get("reference")
    ]
    if not answered:
        return {}

    from ragas.dataset_schema import SingleTurnSample

    ragas_samples = [
        SingleTurnSample(
            user_input=sample["user_input"],
            retrieved_contexts=sample["retrieved_contexts"],
            reference_contexts=sample["reference_contexts"],
            response=sample["response"],
            reference=sample.get("reference", ""),
        )
        for sample in answered
        if sample.get("reference_contexts")
    ]
    if not ragas_samples:
        return {}

    metrics = [load_metric(spec)() for spec in JUDGE_METRICS.values()]
    result = evaluate(
        EvaluationDataset(samples=ragas_samples),
        metrics=metrics,
        llm=judge,
        embeddings=embeddings,
        raise_exceptions=False,
        show_progress=False,
    )
    return aggregate(result)


def compare_with_baseline(
    metrics: dict[str, float | None], baseline_metrics: dict[str, Any]
) -> list[dict[str, Any]]:
    findings = []
    for name, current in sorted(metrics.items()):
        entry = baseline_metrics.get(name)
        if entry is None:
            findings.append(
                {
                    "metric": name,
                    "current": current,
                    "baseline": None,
                    "tolerance": None,
                    "gated": False,
                    "status": "unrecorded",
                }
            )
            continue
        if current is None:
            findings.append(
                {
                    "metric": name,
                    "current": None,
                    "baseline": entry.get("value"),
                    "tolerance": entry.get("tolerance", 0.0),
                    "gated": bool(entry.get("gated", True)),
                    "status": "failed-to-measure",
                }
            )
            continue
        tolerance = float(entry.get("tolerance", 0.0))
        gated = bool(entry.get("gated", True))
        floor = float(entry["value"]) - tolerance
        status = "regressed" if current + 1e-9 < floor else "ok"
        findings.append(
            {
                "metric": name,
                "current": current,
                "baseline": entry.get("value"),
                "tolerance": tolerance,
                "gated": gated,
                "status": status if gated else "reported",
            }
        )
    return findings


def record_baseline(
    path: Path, tier: str, metrics: dict[str, float | None]
) -> dict[str, Any]:
    baseline = load_json(path) if path.exists() else {"version": 1, "tiers": {}}
    baseline.setdefault("version", 1)
    baseline.setdefault("tiers", {})
    baseline["recorded_at"] = date.today().isoformat()
    baseline["tiers"][tier] = {
        "description": TIER_DESCRIPTIONS.get(tier, ""),
        "metrics": {
            name: {
                "value": round(value, 4),
                "tolerance": METRIC_TOLERANCES.get(name, 0.0),
                "gated": is_gated(tier, name),
            }
            for name, value in sorted(metrics.items())
            if value is not None
        },
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(baseline, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return baseline


def is_gated(tier: str, metric: str) -> bool:
    provider_mode = tier.split(":", 1)[0]
    if provider_mode == "stub" and metric in UNGATED_IN_STUB_TIER:
        return False
    return True


TIER_DESCRIPTIONS = {
    "stub:offline": (
        "Deterministic retrieval and guardrail assessment. The provider is a "
        "loopback stub, so the model call itself is not measured; the prompt "
        "assembly, the note ranking and the reply contract are."
    ),
    "live:offline": (
        "Retrieval and guardrail assessment against a live provider. The answer "
        "itself is not judged."
    ),
    "live:offline+judge": (
        "Retrieval assessment plus the LLM-judged answer metrics against a live "
        "provider."
    ),
}


def case_details(samples: list[dict[str, Any]]) -> list[dict[str, Any]]:
    details = []
    for sample in samples:
        expected_contexts = sample.get("expected_context_titles", [])
        details.append(
            {
                "id": sample.get("id"),
                "suite": sample.get("suite"),
                "model_status": sample.get("model_status"),
                "retrieved_context_titles": sample.get("context_titles"),
                "expected_context_titles": expected_contexts,
                "expected_reminder_titles": sample.get("expected_reminder_titles"),
                "open_reminder_titles": sample.get("open_reminder_titles"),
                "retrieval_hit": (
                    all(title in sample.get("context_titles", []) for title in expected_contexts)
                    if expected_contexts
                    else None
                ),
            }
        )
    return details


def main() -> int:
    args = parse_args()

    if not args.input.exists():
        print(f"error: harness output {args.input} does not exist", file=sys.stderr)
        return 2

    payload = load_json(args.input)
    samples = payload.get("samples", [])
    if not samples:
        print("error: the harness output contains no samples", file=sys.stderr)
        return 2

    try:
        import ragas  # noqa: F401
    except ImportError as error:
        print(
            "error: ragas is not installed. Run "
            "`python -m pip install -r eval/ragas/requirements.txt`.",
            file=sys.stderr,
        )
        print(f"details: {error}", file=sys.stderr)
        return 2

    metrics, counts = project_metrics(samples)
    metrics.update(run_offline_metrics(samples))

    judge_metrics = run_judge_metrics(samples)
    if judge_metrics:
        metrics.update(judge_metrics)
        metric_set = "offline+judge"
    else:
        metric_set = "offline"
    tier = f"{payload.get('provider_mode', 'unknown')}:{metric_set}"

    baseline = load_json(args.baseline) if args.baseline.exists() else {"tiers": {}}
    baseline_metrics = baseline.get("tiers", {}).get(tier, {}).get("metrics", {})

    if args.record_baseline:
        record_baseline(args.baseline, tier, metrics)
        print(f"recorded the '{tier}' baseline into {args.baseline}")
        for name, value in sorted(metrics.items()):
            print(f"  {name}: {format_value(value)}")
        return 0

    findings = compare_with_baseline(metrics, baseline_metrics)

    report = {
        "dataset_version": payload.get("version"),
        "provider_mode": payload.get("provider_mode"),
        "model": payload.get("model"),
        "tier": tier,
        "counts": counts,
        "metrics": metrics,
        "comparison": findings,
        "cases": case_details(samples),
    }

    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(
            json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
        )

    print(f"MMGH capability assessment ({tier}, {counts['sample_count']} samples)")
    print(f"  provider mode: {report['provider_mode']}  model: {report['model']}")
    for name, value in sorted(metrics.items()):
        print(f"  {name}: {format_value(value)}")
    print()

    regressions = [f for f in findings if f["status"] == "regressed"]
    unmeasured = [f for f in findings if f["status"] == "failed-to-measure"]
    unrecorded = [f for f in findings if f["status"] == "unrecorded"]

    for finding in unmeasured:
        print(f"error: {finding['metric']} could not be measured", file=sys.stderr)
    for finding in unrecorded:
        print(
            f"warning: {finding['metric']} has no baseline entry; "
            "it is reported but not gated",
            file=sys.stderr,
        )
    for finding in regressions:
        print(
            f"error: {finding['metric']} regressed to {finding['current']:.4f}, "
            f"baseline {finding['baseline']:.4f} (tolerance {finding['tolerance']:.4f})",
            file=sys.stderr,
        )

    if args.no_gate:
        return 0
    return 1 if (regressions or unmeasured) else 0


def format_value(value: float | None) -> str:
    if value is None:
        return "not measured"
    return f"{value:.4f}"


if __name__ == "__main__":
    sys.exit(main())
