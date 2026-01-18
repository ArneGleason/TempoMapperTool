import { TempoUtils } from '../utils/TempoUtils';

export class MetronomeEngine {
    constructor(audioContext) {
        this.ctx = audioContext;
        this.isPlaying = false;

        // Settings
        this.tempoMap = []; // Points: { bar, value }
        this.numerator = 4;
        this.denominator = 4;
        this.volume = 0.5;
        this.accentLevel = 0.8;

        // Scheduler State
        this.nextNoteTime = 0.0; // Hardware Time
        this.absoluteBeat = 0;   // Float: Accumulative standard beats (Quarter notes)
        this.currentBeat = 0;    // 0..(Num-1) (Measure position)
        this.timerID = null;

        // Sync
        this.projectZeroTime = 0; // Hardware Time when Project Time was 0

        // Constants
        this.lookahead = 25.0; // ms
        this.scheduleAheadTime = 0.1; // sec
    }

    start(tempoMap, numerator, denominator = 4, currentProjectTime = 0) {
        if (this.isPlaying) return;

        this.tempoMap = tempoMap || [];
        this.numerator = numerator;
        this.denominator = denominator;
        this.isPlaying = true;

        // Determine Project Zero Time
        // Now = Zero + CurrentProjectTime -> Zero = Now - CurrentProjectTime
        // Add slight latency safety? 
        // If Play starts, we assume Context is running.
        this.projectZeroTime = this.ctx.currentTime - currentProjectTime;

        // Determine First Beat to Schedule
        // Current Beat position
        let currentAbsoluteBeat = 0;
        if (this.tempoMap.length > 0) {
            currentAbsoluteBeat = TempoUtils.getBeatAtTime(currentProjectTime, this.tempoMap);
        } else {
            // Fallback 120
            currentAbsoluteBeat = currentProjectTime * (120 / 60);
        }

        // Align to next scheduling slot
        // Slot size = 4 / Denominator (Quarter notes if denom=4)
        const increment = 4 / this.denominator;

        // Next integer multiple of increment
        // Math.ceil or floor? If we are exactly ON a beat, we want to play it.
        // If current is 1.001, play 2.0 (if inc=1).
        // If current is 0.0, play 0.0.
        // Add small epsilon to avoid double playing if exactly on beat?
        // Actually, if we just Started, we usually want to play immediately if at 0.
        const nextSlot = Math.ceil(currentAbsoluteBeat / increment) * increment;

        this.absoluteBeat = nextSlot;

        // Calculate Measure Position for Accent
        // absoluteBeat / increment -> Integer Step Index
        // Index % Numerator = Beat in Measure
        // We need to sync accent to Measure 0.
        // Assuming Bar 0 starts at Beat 0.
        const stepIndex = Math.round(this.absoluteBeat / increment);
        this.currentBeat = stepIndex % this.numerator;

        // Calculate Hardware Time for this First Beat
        let projectTime = 0;
        if (this.tempoMap.length > 0) {
            projectTime = TempoUtils.getTimeAtBeat(this.absoluteBeat, this.tempoMap);
        } else {
            projectTime = this.absoluteBeat * (60 / 120);
        }

        this.nextNoteTime = this.projectZeroTime + projectTime;

        // Safety: If nextNoteTime is in the past (latency), push forward?
        if (this.nextNoteTime < this.ctx.currentTime) {
            // Skip logic or just let it try (ctx will verify)
            // Better to skip to future to avoid burst of catch-up clicks
            // But for now, let's trust the loop to catch up fast or we accept one 'late' click.
        }

        this.scheduler();
    }

    stop() {
        this.isPlaying = false;
        if (this.timerID) {
            clearTimeout(this.timerID);
            this.timerID = null;
        }
    }

    updateSettings({ volume, accentLevel, tempoMap, numerator, denominator }) {
        if (volume !== undefined) this.volume = volume;
        if (accentLevel !== undefined) this.accentLevel = accentLevel;
        if (tempoMap !== undefined) this.tempoMap = tempoMap;
        if (numerator !== undefined) this.numerator = numerator;
        if (denominator !== undefined) this.denominator = denominator;
    }

    scheduler() {
        if (!this.isPlaying) return;

        while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
            this.scheduleNote(this.currentBeat, this.nextNoteTime);
            this.nextNote();
        }

        this.timerID = setTimeout(() => this.scheduler(), this.lookahead);
    }

    nextNote() {
        // Advance Absolute Beat
        const increment = 4 / this.denominator;
        this.absoluteBeat += increment;

        // Calculate Project Time for new Beat
        let projectTime = 0;
        if (this.tempoMap.length > 0) {
            projectTime = TempoUtils.getTimeAtBeat(this.absoluteBeat, this.tempoMap);
        } else {
            // Fallback
            projectTime = this.absoluteBeat * (60 / 120);
        }

        // Convert to Hardware Time
        this.nextNoteTime = this.projectZeroTime + projectTime;

        // Advance Beat Counter (for Accent)
        this.currentBeat++;
        if (this.currentBeat >= this.numerator) {
            this.currentBeat = 0;
        }
    }

    scheduleNote(beatNumber, time) {
        // Create Osc
        const osc = this.ctx.createOscillator();
        const envelope = this.ctx.createGain();

        osc.connect(envelope);
        envelope.connect(this.ctx.destination);

        if (beatNumber === 0) {
            osc.frequency.value = 1000;
        } else {
            osc.frequency.value = 800;
        }

        const beatGain = beatNumber === 0 ? 1.0 : this.accentLevel;
        const totalGain = this.volume * beatGain;
        const safeGain = Math.max(0.001, totalGain);

        envelope.gain.setValueAtTime(0.001, time);

        if (totalGain > 0.001) {
            envelope.gain.exponentialRampToValueAtTime(safeGain, time + 0.005);
            envelope.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
        } else {
            envelope.gain.setValueAtTime(0, time);
        }

        osc.start(time);
        osc.stop(time + 0.05);
    }
}
