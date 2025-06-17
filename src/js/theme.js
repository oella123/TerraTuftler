/**
 * Represents the application state related to themes and sound.
 */
export const themeState = {
    soundEnabled: true,
    currentTheme: 'theme-standard',
};

/**
 * Applies the selected theme to the body element and saves it to localStorage.
 * @param {string} themeName - The name of the theme (e.g., 'theme-dark').
 * @param {HTMLSelectElement | null} themeSelectElement - The dropdown element for theme selection.
 */
export function setTheme(themeName, themeSelectElement) {
    // document.body.className = ''; // Reverted to monolithic behavior: Remove ALL classes
    // Reverting back to safer targeted removal:
    const themes = ['theme-standard', 'theme-dark'];
    themes.forEach(t => document.body.classList.remove(t));

    const effectiveTheme = themeName || 'theme-standard';
    document.body.classList.add(effectiveTheme);

    themeState.currentTheme = effectiveTheme;
    localStorage.setItem('terraTueftlerTheme', effectiveTheme);

    if (themeSelectElement) {
        themeSelectElement.value = effectiveTheme;
    }
}

/**
 * Loads the saved theme and sound settings from localStorage.
 * @param {HTMLSelectElement | null} themeSelectElement - The dropdown element for theme selection.
 * @param {HTMLInputElement | null} soundToggleElement - The checkbox element for sound setting.
 * @param {function} setupListenersCallback - The callback function to setup listeners after settings are loaded/applied.
 */
export function loadSettings(themeSelectElement, soundToggleElement, setupListenersCallback) {
    // Load theme - Reverted to loading from localStorage
    const savedTheme = localStorage.getItem('terraTueftlerTheme') || 'theme-standard';
    setTheme(savedTheme, themeSelectElement);

    // Load sound setting
    const savedSoundSetting = localStorage.getItem('terraTueftlerSoundEnabled');
    themeState.soundEnabled = savedSoundSetting !== null ? JSON.parse(savedSoundSetting) : true;

    if (soundToggleElement) {
        soundToggleElement.checked = themeState.soundEnabled;
    }
    // Save default sound setting if not present
    if (savedSoundSetting === null) {
         localStorage.setItem('terraTueftlerSoundEnabled', JSON.stringify(themeState.soundEnabled));
    }

    // Call the callback to setup listeners after settings are loaded/applied
    if (typeof setupListenersCallback === 'function') {
        setupListenersCallback();
    }
}

/**
 * Toggles the sound setting and saves it to localStorage.
 * @param {boolean} isEnabled - Whether sound should be enabled.
 */
export function toggleSound(isEnabled) {
    themeState.soundEnabled = isEnabled;
    localStorage.setItem('terraTueftlerSoundEnabled', JSON.stringify(themeState.soundEnabled));
}

/**
 * Plays a sound effect based on the type if sound is enabled.
 * Uses Web Audio API for simple tones.
 * @param {'correct' | 'incorrect' | 'quizEnd' | 'click'} type - The type of sound effect to play.
 */
export function playSound(type) {
    if (!themeState.soundEnabled || (!window.AudioContext && !window.webkitAudioContext)) return;

    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        let oscillator;
        let gainNode;

        gainNode = audioContext.createGain();
        gainNode.connect(audioContext.destination);
        gainNode.gain.setValueAtTime(0.5, audioContext.currentTime); // Volume

        oscillator = audioContext.createOscillator();
        oscillator.connect(gainNode);

        switch (type) {
            case 'correct':
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
                gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.3);
                break;
            case 'incorrect':
                oscillator.type = 'square';
                oscillator.frequency.setValueAtTime(110, audioContext.currentTime); // A2
                gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.4);
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.4);
                break;
            case 'quizEnd':
                const melody = [261.63, 329.63, 391.99, 523.25]; // C4, E4, G4, C5
                let startTime = audioContext.currentTime;
                melody.forEach((freq, index) => {
                    const noteOsc = audioContext.createOscillator();
                    const noteGain = audioContext.createGain();
                    noteOsc.connect(noteGain);
                    noteGain.connect(audioContext.destination);
                    noteOsc.type = 'triangle';
                    noteOsc.frequency.setValueAtTime(freq, startTime + index * 0.15);
                    noteGain.gain.setValueAtTime(0.4, startTime + index * 0.15);
                    noteGain.gain.exponentialRampToValueAtTime(0.001, startTime + index * 0.15 + 0.1);
                    noteOsc.start(startTime + index * 0.15);
                    noteOsc.stop(startTime + index * 0.15 + 0.1);
                });
                break;
             // Add a simple 'click' sound if needed
             // case 'click':
             //     oscillator.type = 'sine';
             //     oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5
             //     gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.05);
             //     oscillator.start(audioContext.currentTime);
             //     oscillator.stop(audioContext.currentTime + 0.05);
             //     break;
        }

        // Close the context after the sound has likely played to free resources
        setTimeout(() => {
            if (audioContext.state !== 'closed') {
                 audioContext.close().catch(e => console.warn("Error closing AudioContext:", e));
            }
        }, 1000);

    } catch (e) {
        console.warn("AudioContext could not be started or used.", e);
        // Disable sound permanently for this session if context fails
        themeState.soundEnabled = false;
        const soundToggleElement = document.getElementById('sound-toggle'); // Attempt to find toggle
        if(soundToggleElement) soundToggleElement.checked = false;
    }
}

// Initialize theme buttons if they exist
/*
document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.querySelector('.theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
});
*/ 