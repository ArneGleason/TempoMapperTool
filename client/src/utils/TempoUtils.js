export const TempoUtils = {
    // Calculate Absolute Time (Seconds) for a given Beat (Float)
    // points: [{ bar: 0, value: 120 }, ...] sorted by bar
    getTimeAtBeat: (targetBeat, points) => {
        if (!points || points.length === 0) return targetBeat * (60 / 120); // Default 120

        const sorted = [...points].sort((a, b) => a.bar - b.bar);
        let accumulatedTime = 0;
        let p_prev = sorted[0];
        // If first point is not at 0, assume 120 before it? Or extend first point backward?
        // Usually init is at 0.
        // If target is before first point, use first point's bpm?
        let prevBeat = p_prev.bar * 4;

        // If target is before first point
        if (targetBeat < prevBeat) {
            return targetBeat * (60 / p_prev.value);
        }

        // Iterate segments
        for (let i = 1; i < sorted.length; i++) {
            const p_curr = sorted[i];
            const currBeat = p_curr.bar * 4;

            if (targetBeat < currBeat) {
                // Target is inside this segment (p_prev -> p_curr)
                const beatsInSeg = targetBeat - prevBeat;
                const spb = 60 / p_prev.value;
                return accumulatedTime + (beatsInSeg * spb);
            } else {
                // Add full segment
                const beatsInSeg = currBeat - prevBeat;
                const spb = 60 / p_prev.value;
                accumulatedTime += beatsInSeg * spb;

                // Advance
                p_prev = p_curr;
                prevBeat = currBeat;
            }
        }

        // After last point
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

        // Iterate
        for (let i = 1; i < sorted.length; i++) {
            const p_curr = sorted[i];
            const currBeat = p_curr.bar * 4;
            const beatsInSeg = currBeat - prevBeat;
            const spb = 60 / p_prev.value;
            const timeInSeg = beatsInSeg * spb;

            if (targetTime < accumulatedTime + timeInSeg) {
                // Inside
                const timeInThis = targetTime - accumulatedTime;
                const beatsInThis = timeInThis / spb;
                return prevBeat + beatsInThis;
            }

            accumulatedTime += timeInSeg;
            p_prev = p_curr;
            prevBeat = currBeat;
        }

        // After last
        const remainingTime = targetTime - accumulatedTime;
        const spb = 60 / p_prev.value;
        return prevBeat + (remainingTime / spb);
    }
};
