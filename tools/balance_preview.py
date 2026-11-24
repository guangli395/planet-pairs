"""Design-only Monte Carlo estimate, not the production game implementation.

Assumptions: independent weighted draws, fixed empty-slot order, six blessings,
rows before columns, full-board matching or final matching on exhaustion.
The family bonus card uses the same weighted pool and grants lucky rewards.
Counts full natural runs, so threshold reach probabilities need no stage resets.
"""

import json
from pathlib import Path
import random
import statistics


BLESSINGS = (
    ("lucky_echo", "幸运回响"),
    ("double_wish", "双重心愿"),
    ("start_gift", "启程赠礼"),
    ("pair_savings", "配对积蓄"),
    ("line_echo", "三连余韵"),
    ("clear_gift", "清场礼赞"),
)
LINES = ((0, 1, 2), (3, 4, 5), (6, 7, 8), (0, 3, 6), (1, 4, 7), (2, 5, 8))


def run(blessing, seed, use_ad):
    rng = random.Random(seed)
    lucky = {0, 1} if blessing == "double_wish" else {0}
    weights = [0.8 if i in lucky else 1.0 for i in range(9)]
    boundaries = []
    total_weight = 0
    for weight in weights:
        total_weight += weight
        boundaries.append(total_weight)
    board = [None] * 9
    initial = 20 if blessing == "start_gift" else 15
    remaining = initial
    collected = pairs = paid = free = grants = 0
    used_ad = False

    def draw():
        sample = rng.random() * total_weight
        return next(i for i, edge in enumerate(boundaries) if sample < edge)

    def award(n):
        nonlocal remaining, grants
        remaining += n
        grants += n

    def on_lucky(card):
        if card in lucky:
            award(2 if blessing == "lucky_echo" else 1)

    def pair_reward():
        nonlocal pairs
        pairs += 1
        award(1)
        if blessing == "pair_savings" and pairs % 3 == 0:
            award(1)

    for round_index in range(10000):
        for slot in range(9):
            if board[slot] is None and remaining > 0:
                remaining -= 1
                paid += 1
                board[slot] = draw()
                on_lucky(board[slot])

        for line in LINES:
            card = board[line[0]]
            if card is not None and all(board[i] == card for i in line):
                for i in line:
                    board[i] = None
                collected += 3
                award(3 if blessing == "line_echo" else 2)

        for card in range(9):
            slots = [i for i, value in enumerate(board) if value == card]
            for offset in range(0, len(slots) - 1, 2):
                board[slots[offset]] = board[slots[offset + 1]] = None
                collected += 2
                pair_reward()

        if all(card is not None for card in board):
            assert len(set(board)) == 9
            bonus = draw()
            free += 1
            on_lucky(bonus)
            board[board.index(bonus)] = None
            collected += 2
            pair_reward()

        if all(card is None for card in board):
            award(7 if blessing == "clear_gift" else 5)

        occupied = sum(card is not None for card in board)
        assert collected + occupied == paid + free
        assert initial + grants == paid + remaining
        if remaining == 0:
            if use_ad and not used_ad:
                used_ad = True
                award(10)
            else:
                return collected, paid + free, False
    return collected, paid + free, True


def main():
    samples = 10000
    rows = []
    for blessing_index, (blessing, name) in enumerate(BLESSINGS):
        for use_ad in (False, True):
            runs = [run(blessing, 20261124 + blessing_index * samples + i, use_ad)
                    for i in range(samples)]
            scores = sorted(score for score, _, _ in runs)
            rows.append({
                "blessing": name,
                "ad_plus_10": use_ad,
                "samples": samples,
                "mean_collected": round(statistics.mean(scores), 2),
                "median_collected": statistics.median(scores),
                "p95_collected": scores[int(samples * 0.95)],
                "reach_50_pct": round(100 * sum(s >= 50 for s in scores) / samples, 2),
                "reach_60_pct": round(100 * sum(s >= 60 for s in scores) / samples, 2),
                "reach_100_pct": round(100 * sum(s >= 100 for s in scores) / samples, 2),
                "safety_capped_runs": sum(capped for _, _, capped in runs),
            })
    output = Path(__file__).resolve().parents[1] / "docs" / "概率初步模拟.json"
    output.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(rows, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
