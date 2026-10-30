# Capability Assessment

This directory holds the Ragas capability assessment for the MMGH agent runtime.

The assessment is a **regression gate**, not a benchmark. It drives the real prompt-assembly
path of the agent runtime over a small, hand-written dataset and fails the build when a
measured capability drops below a committed baseline.

## What the agent runtime actually retrieves

The runtime has exactly one retrieval mechanism: the keyword ranker in
`src-tauri/src/agent/contract.rs` (`select_relevant_notes`). It scores the 12 most recent
notes, keeps the 3 best, and stages them into the model prompt. Two other things reach the
prompt but are not retrieved:

- **Skills** are mounted by hand. The runtime never ranks them.
- **Reminders** are staged unfiltered, up to 4 of them.

So the assessment measures the note ranker, the prompt assembly, and the reply contract. It
does not measure embeddings, because the product has no embedding index.

## The pieces

| File | Role |
| --- | --- |
| `dataset.json` | The evaluation cases: prompts, notes, reminders, skills, and the context each case expects. |
| `../../src-tauri/src/bin/ragas_eval_harness.rs` | Drives the real prompt assembly and writes one sample per case. |
| `evaluate.py` | Turns the samples into Ragas samples, scores them, and compares the result with the baseline. |
| `baseline.json` | The committed baseline, keyed by tier. |
| `requirements.txt` | The pinned Ragas stack. |
| `../../.github/workflows/ragas-ci.yml` | The CI workflow that runs the assessment. |

## The harness drives the production code path

For every case the harness creates a throwaway app data directory, seeds a session, notes,
reminders and skills, and then calls `agent::run_agent_for_evaluation`. That call goes through
`AgentRuntimeContract::for_session` → `build_runtime_context` → `select_relevant_notes` →
`compose_prompt`, so the staged contexts are the ones the product would stage for the same
input.

Two details keep the measurement honest:

- **Only the provider is stubbed.** The stub is a loopback OpenAI-compatible endpoint that
  answers with a canned reply. Everything upstream of the model call is production code.
- **The reference contexts come from the product's own renderer.**
  `agent::render_reference_context` renders a note the same way the runtime context block
  renders it, so the offline metrics compare exactly what the model saw against the note the
  case expects, instead of against a hand-written paraphrase.

The harness never reads the system keyring. It passes an explicit `db::AgentSettings` into the
runtime instead of calling `db::load_settings()`, so an evaluation run cannot touch the
operator's stored credentials.

## Metrics, and how each number is counted

`stub:offline` is the tier CI always runs.

| Metric | Definition | Denominator | Baseline |
| --- | --- | --- | --- |
| `retrieval_hit_rate` | Fraction of cases whose `expected_context_titles` are all present in the staged note titles. | 8 cases, every case declares at least one expected note. | 1.0 (8/8) |
| `reminder_hit_rate` | Fraction of cases whose `expected_reminder_titles` are all present in the staged reminder titles. | 1 case (`hosting-invoice`). | 1.0 (1/1) |
| `guardrail_pass_rate` | Fraction of `suite: "guardrail"` cases the runtime refused: `model_status != "completed"`, meaning the runtime contract rejected the reply, **and** the persisted reply contains none of the forbidden side-effect claims. The runtime is the authority; the scorer keeps a mirror of the runtime pattern list as a second net. | 1 case (`guardrail-side-effect`). | 1.0 (1/1) |
| `provider_completion_rate` | Fraction of cases the provider answered (`model_status == "completed"`). | 8 cases. | 0.875 (7/8) |
| `non_llm_context_precision_with_reference` | Ragas `NonLLMContextPrecisionWithReference`: each staged context is scored by its best string similarity to any reference context, marked relevant above a 0.5 threshold, and the precisions are averaged over the ranks. It only reaches 1.0 when the expected note is staged **first**. | 8 cases. | 1.0 (8/8) |
| `non_llm_context_recall` | Ragas `NonLLMContextRecall`: the fraction of reference contexts covered by some staged context. It reaches 1.0 when the expected note is staged **anywhere**. | 8 cases. | 1.0 (8/8) |

`provider_completion_rate` is reported but **not gated** in the stub tier. The one case that
does not complete is the guardrail case, which the runtime rejects on purpose, so the number
describes the dataset rather than the runtime. The live tier measures a real provider, so
there the completion rate is a capability and stays gated.

Ragas adds `1e-10` to the denominator of its average precision, so a perfect ranking reads
`0.9999999999`. The report rounds the value to 1.0.

`retrieval_hit_rate` and `non_llm_context_recall` answer "did the note reach the prompt",
while `non_llm_context_precision_with_reference` answers "did the note reach the prompt
first". A ranker that stages the right note in the wrong slot fails the second and passes the
first.

## Tiers

A tier is the provider mode plus the metric set, for example `stub:offline` or
`live:offline+judge`. Baselines are recorded per tier, so the two provider modes never share
a baseline.

- **`stub:offline`** — always runs, needs no credentials. Measures retrieval and the reply
  contract. The model call itself is not measured.
- **`live:offline`** — same metrics against a live provider.
- **`live:offline+judge`** — adds the LLM-judged answer metrics `context_precision`,
  `context_recall`, `faithfulness` and `answer_relevancy`. `answer_relevancy` also needs
  embeddings.

The judge metrics only run against samples the provider actually answered, so a case that fell
back to the local preview reply is never scored as if the model had written it.

## Running it locally

```bash
python -m venv .venv-ragas
.venv-ragas/Scripts/python -m pip install -r eval/ragas/requirements.txt

cargo build --manifest-path src-tauri/Cargo.toml --bin ragas_eval_harness

src-tauri/target/debug/ragas_eval_harness \
  --dataset eval/ragas/dataset.json \
  --out artifacts/ragas-samples.json \
  --provider stub \
  --data-dir artifacts/ragas-work

.venv-ragas/Scripts/python eval/ragas/evaluate.py \
  --input artifacts/ragas-samples.json \
  --baseline eval/ragas/baseline.json \
  --out artifacts/ragas-report.json
```

The scorer exits `0` when every gated metric holds, `1` when a gated metric regressed or
could not be measured, and `2` when the setup was wrong.

## Recording a new baseline

Only record a new baseline when a measured capability is *supposed* to change. The baseline is
what the gate compares against, so re-recording it hides the regression you were trying to
see.

```bash
.venv-ragas/Scripts/python eval/ragas/evaluate.py \
  --input artifacts/ragas-samples.json \
  --baseline eval/ragas/baseline.json \
  --record-baseline
```

The command writes only the tier it just measured and leaves the other tiers alone.

## The live tier

The live tier needs three repository secrets:

| Secret | Meaning |
| --- | --- |
| `MMGH_EVAL_BASE_URL` | The OpenAI-compatible base URL of the provider under test. |
| `MMGH_EVAL_API_KEY` | The provider key. |
| `MMGH_EVAL_MODEL` | The model id to request. |

The judge reuses those three unless it is given its own:

| Secret | Fallback |
| --- | --- |
| `RAGAS_JUDGE_API_KEY` | `MMGH_EVAL_API_KEY` |
| `RAGAS_JUDGE_BASE_URL` | `MMGH_EVAL_BASE_URL` |
| `RAGAS_JUDGE_MODEL` | `MMGH_EVAL_MODEL` |
| `RAGAS_JUDGE_EMBEDDING_MODEL` | `text-embedding-3-small` |

The live tier sends the evaluation dataset — synthetic notes and prompts, no operator data —
to whichever provider is configured. No live baseline is committed, so the tier reports
without gating; record one to make it gate.

## What this assessment is not

- It is not a statistically powered benchmark. Eight cases cannot produce a meaningful
  quality score. The numbers describe this dataset on this commit, and the gate says whether
  that description changed.
- The offline tier never measures answer quality. It measures what the runtime staged and
  what it refused to accept.
- The dataset is synthetic and the ranker is a substring matcher. A case passes only when the
  prompt literally contains a keyword of the expected note, so a paraphrased prompt would fail
  even though a reader would call the retrieval correct.
- The judge metrics are only as good as the judge. A single judge model and a single run per
  case make them noisy; that is why the judge tolerances are looser than the offline ones.
