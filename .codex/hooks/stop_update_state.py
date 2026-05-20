#!/usr/bin/env python3
import json
import sys


CONTINUATION_PROMPT = (
    "CHANGELOG.md、NOW.md、docs/tickets/ のチケット状態を確認し、"
    "必要なら更新してください。"
)


def emit(payload):
    print(json.dumps(payload, ensure_ascii=False))


def main():
    try:
        event = json.load(sys.stdin)
    except json.JSONDecodeError as exc:
        emit(
            {
                "continue": True,
                "systemMessage": f"Stop hook input JSON parse failed: {exc}",
            }
        )
        return 0

    if event.get("stop_hook_active"):
        emit({"continue": True})
        return 0

    emit({"decision": "block", "reason": CONTINUATION_PROMPT})
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
