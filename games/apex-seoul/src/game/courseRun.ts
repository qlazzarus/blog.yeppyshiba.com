export type CourseRunConfig = {
    checkpointRatios: readonly number[];
    countdownSeconds: number;
    finishRatio: number;
};

export type CourseRunState = {
    countdownRemainingSec: number;
    elapsedSec: number;
    finishTimeSec: number | null;
    finished: boolean;
    passedCheckpoints: number;
    progressRatio: number;
    started: boolean;
};

export function createCourseRunState(
    config: CourseRunConfig,
    skipCountdown = false,
): CourseRunState {
    return {
        countdownRemainingSec: skipCountdown ? 0 : config.countdownSeconds,
        elapsedSec: 0,
        finishTimeSec: null,
        finished: false,
        passedCheckpoints: 0,
        progressRatio: 0,
        started: skipCountdown,
    };
}

export function updateCourseRunCountdown(state: CourseRunState, seconds: number) {
    if (state.started || state.finished) return;

    state.countdownRemainingSec = Math.max(0, state.countdownRemainingSec - seconds);
    state.started = state.countdownRemainingSec === 0;
}

export function updateCourseRunProgress(
    state: CourseRunState,
    progressRatio: number,
    seconds: number,
    config: CourseRunConfig,
) {
    if (!state.started || state.finished) return false;

    state.elapsedSec += seconds;
    state.progressRatio = clamp(progressRatio, 0, config.finishRatio);
    state.passedCheckpoints = config.checkpointRatios.filter(
        (checkpointRatio) => state.progressRatio >= checkpointRatio,
    ).length;

    if (state.progressRatio < config.finishRatio) return false;

    state.finished = true;
    state.finishTimeSec = state.elapsedSec;

    return true;
}

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}
