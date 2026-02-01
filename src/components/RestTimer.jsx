import { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import './RestTimer.css';

const RestTimer = ({ suggestedRestSeconds = 60, onComplete }) => {
    const [timeLeft, setTimeLeft] = useState(suggestedRestSeconds);
    const [isRunning, setIsRunning] = useState(false);
    const [selectedPreset, setSelectedPreset] = useState(suggestedRestSeconds);

    const presets = [30, 60, 90, 120];

    useEffect(() => {
        let interval;
        if (isRunning && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        setIsRunning(false);
                        if (onComplete) onComplete();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isRunning, timeLeft, onComplete]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleStart = () => {
        if (timeLeft === 0) {
            setTimeLeft(selectedPreset);
        }
        setIsRunning(true);
    };

    const handlePause = () => {
        setIsRunning(false);
    };

    const handleReset = () => {
        setIsRunning(false);
        setTimeLeft(selectedPreset);
    };

    const handlePresetClick = (preset) => {
        setSelectedPreset(preset);
        setTimeLeft(preset);
        setIsRunning(false);
    };

    const progress = selectedPreset > 0 ? ((selectedPreset - timeLeft) / selectedPreset) * 100 : 0;

    return (
        <div className="rest-timer">
            <div className="timer-display">
                <div className="timer-circle" style={{ '--progress': `${progress}%` }}>
                    <div className="timer-text">{formatTime(timeLeft)}</div>
                </div>
            </div>

            <div className="timer-presets">
                {presets.map(preset => (
                    <button
                        key={preset}
                        className={`preset-btn ${selectedPreset === preset ? 'active' : ''}`}
                        onClick={() => handlePresetClick(preset)}
                    >
                        {preset}s
                    </button>
                ))}
            </div>

            <div className="timer-controls">
                {!isRunning ? (
                    <button className="control-btn primary" onClick={handleStart}>
                        <Play size={18} fill="currentColor" />
                        Start
                    </button>
                ) : (
                    <button className="control-btn" onClick={handlePause}>
                        <Pause size={18} />
                        Pause
                    </button>
                )}
                <button className="control-btn" onClick={handleReset}>
                    <RotateCcw size={18} />
                    Reset
                </button>
            </div>
        </div>
    );
};

export default RestTimer;
