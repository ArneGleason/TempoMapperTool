export const TempoUtils = {
    // Calculate Absolute Time (Seconds) for a given Beat (Float)
    getTimeAtBeat: (targetBeat, points) => {
        if (!points || points.length === 0) return targetBeat * (60 / 120);

        const sorted = [...points].sort((a, b) => a.bar - b.bar);
        let accumulatedTime = 0;
        let p_prev = sorted[0];
        let prevBeat = p_prev.bar * 4;

        // If target is before first point
        if (targetBeat < prevBeat) {
            return targetBeat * (60 / p_prev.value);
        }

        for (let i = 1; i < sorted.length; i++) {
            const p_curr = sorted[i];
            const currBeat = p_curr.bar * 4;

            // Check if target matches exactly or is within this segment
            if (targetBeat <= currBeat) {
                const beatDelta = targetBeat - prevBeat;
                const tempoDelta = p_curr.value - p_prev.value;
                const beatsRange = currBeat - prevBeat;

                if (beatsRange === 0) return accumulatedTime; // Should not happen if sorted and distinct

                // Constant Tempo Case
                if (Math.abs(tempoDelta) < 0.001) {
                    const spb = 60 / p_prev.value;
                    return accumulatedTime + (beatDelta * spb);
                }

                // Ramp Case
                // m = tempoDelta / beatsRange
                // t = (60/m) * ln((Ts + m*x) / Ts)
                const m = tempoDelta / beatsRange;
                const Ts = p_prev.value;
                const x = beatDelta;

                // Avoid singularity if Ts + mx <= 0? (Tempo <= 0 is invalid)
                // Assuming positive bpm.
                const timeInSeg = (60 / m) * Math.log((Ts + m * x) / Ts);
                return accumulatedTime + timeInSeg;
            }

            // Full Segment Add
            const beatsRange = currBeat - prevBeat;
            const tempoDelta = p_curr.value - p_prev.value;

            if (Math.abs(tempoDelta) < 0.001) {
                accumulatedTime += beatsRange * (60 / p_prev.value);
            } else {
                const m = tempoDelta / beatsRange;
                const Ts = p_prev.value;
                const x = beatsRange;
                accumulatedTime += (60 / m) * Math.log((Ts + m * x) / Ts);
            }

            p_prev = p_curr;
            prevBeat = currBeat;
        }

        // After last point (Constant Tempo)
        const remainingBeats = targetBeat - prevBeat;
        const spb = 60 / p_prev.value;
        return accumulatedTime + (remainingBeats * spb);
    },

    // Calculate Beat (Float) for a given Time (Seconds)
    getBeatAtTime: (targetTime, points) => {
        if (!points || points.length === 0) return targetTime / (60 / 120);

        const sorted = [...points].sort((a, b) => a.bar - b.bar);
        let accumulatedTime = 0;
        let p_prev = sorted[0];
        let prevBeat = p_prev.bar * 4;

        for (let i = 1; i < sorted.length; i++) {
            const p_curr = sorted[i];
            const currBeat = p_curr.bar * 4;
            const beatsRange = currBeat - prevBeat;
            const tempoDelta = p_curr.value - p_prev.value;

            let timeInSeg = 0;
            const m = tempoDelta / beatsRange;
            const Ts = p_prev.value;

            if (Math.abs(tempoDelta) < 0.001) {
                timeInSeg = beatsRange * (60 / Ts);

                if (targetTime <= accumulatedTime + timeInSeg) {
                    const timeInThis = targetTime - accumulatedTime;
                    return prevBeat + (timeInThis / (60 / Ts));
                }
            } else {
                // Time for full segment
                // t = (60/m) * ln(Te / Ts)
                // Te = Ts + m*x_full = p_curr.value
                timeInSeg = (60 / m) * Math.log(p_curr.value / Ts);

                if (targetTime <= accumulatedTime + timeInSeg) {
                    // Inside Ramp
                    // Target Time Relative
                    const t = targetTime - accumulatedTime;

                    // b - Bs = (Ts/m) * (exp(t*m/60) - 1)
                    const beatDelta = (Ts / m) * (Math.exp(t * m / 60) - 1);
                    return prevBeat + beatDelta;
                }
            }

            accumulatedTime += timeInSeg;
            p_prev = p_curr;
            prevBeat = currBeat;
        }

        // After last
        const remainingTime = targetTime - accumulatedTime;
        const spb = 60 / p_prev.value;
        return prevBeat + (remainingTime / spb);
    },

    // New Helper: Get Tempo at Beat
    getTempoAtBeat: (targetBeat, points) => {
        if (!points || points.length === 0) return 120;
        const sorted = [...points].sort((a, b) => a.bar - b.bar);

        let p_prev = sorted[0];
        let prevBeat = p_prev.bar * 4;

        if (targetBeat <= prevBeat) return p_prev.value;

        for (let i = 1; i < sorted.length; i++) {
            const p_curr = sorted[i];
            const currBeat = p_curr.bar * 4;

            if (targetBeat <= currBeat) {
                // Interpolate
                const startTempo = p_prev.value;
                const endTempo = p_curr.value;
                // Avoid div by zero
                const range = currBeat - prevBeat;
                if (range <= 0.001) return endTempo;

                const progress = (targetBeat - prevBeat) / range;
                return startTempo + (endTempo - startTempo) * progress;
            }

            p_prev = p_curr;
            prevBeat = currBeat;
        }

        // After last point, hold constant
        return p_prev.value;
    },

    // New Helper: Get Tempo at Time
    getTempoAtTime: (targetTime, points) => {
        // reuse getBeatAtTime
        const beat = TempoUtils.getBeatAtTime(targetTime, points);
        return TempoUtils.getTempoAtBeat(beat, points);
    }
};
