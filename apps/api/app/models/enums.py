from __future__ import annotations

import enum


class ProgressUnit(str, enum.Enum):
    episodes = "episodes"
    chapters = "chapters"
    volumes = "volumes"
    minutes = "minutes"
    percentage = "percentage"
    hours = "hours"


class ProgressEventType(str, enum.Enum):
    update = "update"
    reset = "reset"
