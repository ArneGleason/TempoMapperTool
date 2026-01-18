class TempoMap {
    constructor() {
        this.markers = [
            { beat: 0, time: 0, bpm: 120, timeSig: [4, 4] }
        ];
    }

    addMarker(beat, time, bpm) {
        this.markers.push({ beat, time, bpm });
        this.markers.sort((a, b) => a.beat - b.beat);
    }

    // Convert beat to time
    getTimeAtBeat(beat) {
        // TODO: Interpolate based on markers
        const bpm = 120;
        return (beat / bpm) * 60;
    }

    // Convert time to beat
    getBeatAtTime(time) {
        // TODO: Interpolate based on markers
        const bpm = 120;
        return (time / 60) * bpm;
    }
}

export default new TempoMap();
