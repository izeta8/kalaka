
import argparse
import json
from pathlib import Path
import os
import statistics
from time import perf_counter
from collections.abc import Callable
from pydantic import BaseModel

from moderation.classifiers import ClassifierSchema, LabelType, get_labels_from_infractions, classify_gemini, classify_llama, classify_gemma, gemini, llama, gemma

ROOT_DIR = Path(__file__).parent
DATASETS_DIR = ROOT_DIR / "datasets"
# One folder per dataset, model and host: runs/<dataset>/<model>@<host>/
# so a measurement never overwrites another one taken on a different set or machine
RUNS_DIR = ROOT_DIR / "runs"
DATASETS = {
    "dev": DATASETS_DIR / "moderation-dev.jsonl",
    "test": DATASETS_DIR / "moderation-test.jsonl",
}
AVAILABLE_MODELS = ["gemini-3.5-flash-lite", "llama3.2", "gemma3:4b"]

class Model(BaseModel):
    name: str
    dataset_file: Path
    evaluation_file: Path
    metrics_file: Path
    classify_function: Callable[[str], (ClassifierSchema | None)]

# (min recall, min precision) per label, as fractions. Provisional, from the spec
TRESHOLDS = {
    "insult": (0.8, 0.9),
    "threat": (1.0, 0.7),
    "spam": (0.8, 0.9),
    "personal_data": (1.0, 0.7),
}

class PostEvaluation(BaseModel):
    id: str
    expected: list[LabelType]
    predicted: list[LabelType] | None
    latency: float

class DatasetPost(BaseModel):
    id: str
    text: str
    labels: list[LabelType]
    language: str
    style: str
    kind: str
    note: str
    reviewed: bool

##############
#            #
# EVALUATION #
#            #
##############

def evaluate(model: Model, resume: bool = False, overwrite: bool = False):
    # Never wipe a finished measurement by accident: rerunning needs --resume or --overwrite
    if not resume and not overwrite and has_evaluations(model.evaluation_file):
        raise SystemExit(
            f"{model.evaluation_file} already has results. "
            "Use --resume to finish it or --overwrite to start again."
        )
    model.evaluation_file.parent.mkdir(parents=True, exist_ok=True)
    done_ids = load_done_ids(model.evaluation_file) if resume else set()
    with open(model.dataset_file, "r") as fp:
        if not resume:
            clear_evaluation_file(model.evaluation_file)
        for line in fp:
            post = get_post_from_dataset_line(line)
            if post.id in done_ids:
                continue
            print("Processing Post: " + post.id)
            post_evaluation = evaluate_post(model.classify_function, post)
            write_evaluation(model.evaluation_file, post_evaluation)

def has_evaluations(evaluation_file: Path) -> bool:
    return evaluation_file.exists() and evaluation_file.stat().st_size > 0

def get_post_from_dataset_line(json_line: str) -> DatasetPost:
    dataset_post = DatasetPost.model_validate_json(json_line)
    return dataset_post

def evaluate_post(classify_function: Model, dataset_post: DatasetPost) -> PostEvaluation:
    # Start clock to calculate latency
    start = perf_counter()

    # Evaluation
    response = classify_function(dataset_post.text)

    # Calculate latency
    end = perf_counter()
    latency = end - start

    # Parse response
    prediction: list[LabelType] | None
    if response is None:
        prediction = None
    else:
        prediction = get_labels_from_infractions(response.infractions)

    return PostEvaluation(
        id=dataset_post.id, 
        expected=dataset_post.labels,
        predicted=prediction,
        latency=latency
    )

def load_done_ids(evaluation_file: str) -> set[str]:
    # Posts already evaluated, so that --resume only runs the missing ones
    if not os.path.exists(evaluation_file):
        return set()
    with open(evaluation_file, "r") as fp:
        return {get_evaluation_from_file(line).id for line in fp if line.strip()}

def clear_evaluation_file(evaluation_file: str):
    open(evaluation_file, 'w').close()

def write_evaluation(evaluation_file: str, post_evaluation: PostEvaluation):
    with open(evaluation_file, "a") as myfile:
        evaluation_str = post_evaluation.model_dump_json()
        myfile.write(evaluation_str + "\n")

###########
#         #
# METRICS #
#         #
###########

def metrics(model: Model):

    metrics_file = model.metrics_file
    evaluation_file = model.evaluation_file

    if not has_evaluations(evaluation_file):
        raise SystemExit(f"No results in {evaluation_file}: evaluate first.")

    evaluations = load_evaluations(evaluation_file)
    clear_metrics_file(metrics_file)

    for label in TRESHOLDS:
        tp, fp, fn = count_label(evaluations, label)
        write_label_report(metrics_file, label, tp, fp, fn)

    print_latency(metrics_file, evaluations)
    print_failures(evaluations)
    

def load_evaluations(evaluation_file: str) -> list[PostEvaluation]:
    evaluations: list[PostEvaluation] = []
    with open(evaluation_file, "r") as fp:
        for line in fp:
            evaluations.append(get_evaluation_from_file(line))
            
    return evaluations


def count_label(evaluations: list[PostEvaluation], label: LabelType) -> tuple[int, int, int]:

    tp = 0
    fp = 0
    fn = 0
    
    for evaluation in evaluations:
        is_expected = label in evaluation.expected 
        is_predicted = label in evaluation.predicted if evaluation.predicted is not None else False
        
        if (is_expected and is_predicted): tp = tp+1 
        if (not is_expected and is_predicted): fp = fp+1 
        if (is_expected and not is_predicted): fn = fn+1 

    return (tp, fp, fn)

def format_metric(value: float | None) -> str:
    return "n/a" if value is None else f"{value:.0%}"

def write_label_report(metrics_file: str, label: LabelType, tp: int, fp: int, fn: int):

    recall = calculate_recall(tp, fn)
    precision = calculate_precision(tp, fp)
 
    (min_recall, min_precision) = TRESHOLDS[label]

    # A metric that can't be computed (None) never passes
    recall_passes = recall is not None and recall >= min_recall
    precision_passes = precision is not None and precision >= min_precision

    line = (
        f"{label:<14} TP {tp:>2}  FP {fp:>2}  FN {fn:>2}  "
        f"recall {format_metric(recall):>4} (min {min_recall:.0%}) {"✅" if recall_passes else "❌"}  "
        f"precision {format_metric(precision):>4} (min {min_precision:.0%}) {"✅" if precision_passes else "❌"}"
    )
    print(line)
    with open(metrics_file, "a") as myfile:
        myfile.write(line + "\n")


def print_latency(evaluation_file: str, evaluations: list[PostEvaluation]):

    latencies: list[float] = []
    for evaluation in evaluations:
        latencies.append(evaluation.latency)

    mean = statistics.mean(latencies)
    # quantiles(n=20) returns the 19 cut points between 5% slices; [18] is the 95% one
    p95 = statistics.quantiles(latencies, n=20)[18]

    invalid = 0
    for evaluation in evaluations:
        if evaluation.predicted is None:
            invalid = invalid + 1

    line = f"latency mean {mean:.2f} s  p95 {p95:.2f} s  invalid responses {invalid}/{len(evaluations)}"
    print("\n" + line)
    with open(evaluation_file, "a") as myfile:
        myfile.write(line + "\n")


def print_failures(evaluations: list[PostEvaluation]):

    failures: list[PostEvaluation] = []
    for evaluation in evaluations:
        # Sets so that ["insult", "threat"] matches ["threat", "insult"]
        if evaluation.predicted is None or set(evaluation.predicted) != set(evaluation.expected):
            failures.append(evaluation)

    print(f"\nfailures: {len(failures)}/{len(evaluations)}")
    for failure in failures:
        print(f"  {failure.id}  expected {failure.expected}  predicted {failure.predicted}")


def get_evaluation_from_file(json_line: str) -> PostEvaluation:
    post_evaluation = PostEvaluation.model_validate_json(json_line)
    return post_evaluation

def calculate_recall(tp: int, fn: int) -> float | None:
    denominator = tp+fn
    if denominator == 0:
        return None
    return tp/denominator

def calculate_precision(tp: int, fp: int) -> float | None:
    denominator = tp+fp
    if denominator == 0:
        return None
    return tp/denominator


def clear_metrics_file(metrics_file: str):
    open(metrics_file, 'w').close()


########
#      #
# MAIN #
#      #
########

def main(args):
    model_name = args.model if len(args.model) > 0 else None

    if not model_name:
        raise ValueError("You must specify a model with --model")
    if model_name not in AVAILABLE_MODELS:
        raise ValueError(f"Unknown model '{model_name}'. Available: {AVAILABLE_MODELS}")

    
    classify_function = None
    client = None
    if model_name == "llama3.2":
        classify_function = classify_llama
        client = llama
    elif model_name == "gemini-3.5-flash-lite":
        classify_function = classify_gemini
        client = gemini
    elif model_name == "gemma3:4b":
        classify_function = classify_gemma
        client = gemma
    else:
        raise ValueError("No classify_function specified for model: " + model_name)

    # The host comes from the client's base_url, so the laptop (localhost) and the
    # CT (192.168.1.107) land in different folders without having to remember a flag
    host = client.base_url.host
    run_dir = RUNS_DIR / args.dataset / f"{model_name.replace(':', '-')}@{host}"

    model = Model(
        name=model_name,
        dataset_file=DATASETS[args.dataset],
        evaluation_file=run_dir / "results.jsonl",
        metrics_file=run_dir / "metrics.txt",
        classify_function=classify_function
    )
    print(f"Dataset: {model.dataset_file.relative_to(ROOT_DIR)}  Run: {run_dir.relative_to(ROOT_DIR)}")

    if args.metric:
        metrics(model)
    else:
        evaluate(model, resume=args.resume, overwrite=args.overwrite)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Evaluation pipeline.")
        
    parser.add_argument("--model", required=True, choices=AVAILABLE_MODELS, help="Model to evaluate")
    parser.add_argument("--dataset", default="dev", choices=DATASETS.keys(), help="Dataset to evaluate. 'test' is only for the final measurement.")
    parser.add_argument("--resume", action="store_true", help="Keep the existing results and only evaluate the missing posts.")
    parser.add_argument("--overwrite", action="store_true", help="Delete the existing results of this run and start again.")
    parser.add_argument("--metric", action="store_true", help="If included, it will generate metrics instead of evaluating.")
    
    args = parser.parse_args()
    main(args)

