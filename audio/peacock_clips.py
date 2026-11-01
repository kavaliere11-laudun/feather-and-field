# The peacock's call (Audrey, 1 Nov 2026: "we probably need special noise for the peacock"; of two recordings, "Dartmoor,
# England is better but will need to be reworked a little to remove noise"): Keith Selmes's "Peacock.wav" (Freesound
# 397357, CC BY 4.0; a peacock in woodland near Dartmoor, with cars, small birds and hiss behind), the file Audrey
# downloaded. Cleaned: the low rumble (cars) cut below 520 Hz, the steady hiss taken out by spectral gating against a
# quiet stretch (11-16 s), the little birds' chirps between calls gone with the gaps (each clip is just his calls, with
# soft ends; any quiet between two calls in a clip is gated down), then evened out to -18 LUFS.
# Out: web3d/audio/farm/peacall1-4.mp3 and their lengths added to farm.json. Usage: python3 audio/peacock_clips.py SRC.wav
import json, os, sys, subprocess, numpy as np, scipy.io.wavfile as wf, scipy.signal as ss, noisereduce as nr
SRC = sys.argv[1] if len(sys.argv) > 1 else '/tmp/claude-0/peacall/src/peacock.wav'
OUT = '/home/claude/ff-source/web3d/audio/farm'; TMP = '/tmp/claude-0/peacall/work'; os.makedirs(TMP, exist_ok=True)
sr, x = wf.read(SRC); x = x.astype(np.float32).mean(1) / 32768
x = ss.sosfiltfilt(ss.butter(4, 520, 'highpass', fs=sr, output='sos'), x)
x = ss.sosfiltfilt(ss.butter(2, 8000, 'lowpass', fs=sr, output='sos'), x).astype(np.float32)       # (and the little birds' highest chirps)
noise = x[int(11 * sr):int(16 * sr)]
y = nr.reduce_noise(y=x, sr=sr, y_noise=noise, stationary=True, prop_decrease=0.95, n_fft=2048, freq_mask_smooth_hz=300, time_mask_smooth_ms=60).astype(np.float32)
def lufs(path):
    out = subprocess.run(['ffmpeg', '-hide_banner', '-i', path, '-af', 'ebur128=framelog=quiet', '-f', 'null', '-'], capture_output=True, text=True).stderr
    for line in out.splitlines()[::-1]:
        if line.strip().startswith('I:'): return float(line.split()[1])
def gate(z, calls, a):
    """Everything outside his calls (each (start, end) in seconds) faded right down: no chirps or hiss in the gaps."""
    env = np.full(len(z), 0.03, np.float32); r = int(0.06 * sr)
    for (c0, c1) in calls:
        i0, i1 = max(0, int((c0 - a) * sr)), min(len(z), int((c1 - a) * sr))
        env[i0:i1] = 1.0
        lo = max(0, i0 - r); env[lo:i0] = np.maximum(env[lo:i0], np.linspace(0.03, 1, i0 - lo))
        hi = min(len(z), i1 + r); env[i1:hi] = np.maximum(env[i1:hi], np.linspace(1, 0.03, hi - i1))
    return z * env
CLIPS = {                                        # (from, to) in the recording, and his calls in it
    'peacall1': (22.3, 24.7, [(22.38, 23.25), (23.7, 24.55)]),        # two: "may-AW ... may-AW"
    'peacall2': (0.92, 1.95, [(0.98, 1.88)]),                           # one
    'peacall3': (41.6, 43.75, [(41.66, 42.55), (42.8, 43.6)]),
    'peacall4': (53.4, 54.6, [(53.45, 54.45)]),
    # (not 3.85-6.2: clicks and a bird's chirp inside his calls)
}
meta = {k: v for k, v in json.load(open(f'{OUT}/farm.json')).items() if not k.startswith('peacall')}
for name, (a, b, calls) in CLIPS.items():
    z = gate(y[int(a * sr):int(b * sr)].copy(), calls, a)
    fi, fo = int(0.02 * sr), int(0.12 * sr); z[:fi] *= np.linspace(0, 1, fi); z[-fo:] *= np.linspace(1, 0, fo) ** 1.5
    tmp = f'{TMP}/{name}.wav'; wf.write(tmp, sr, (np.clip(z / max(1e-6, np.abs(z).max()) * 0.9, -1, 1) * 32767).astype(np.int16))
    g = -18 - lufs(tmp)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-af', f'volume={g:.2f}dB,alimiter=limit=0.89:level=false', '-ac', '1', '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '80k', '-map_metadata', '-1', f'{OUT}/{name}.mp3'], check=True)
    meta[name] = {'len': round(len(z) / sr, 3)}
    print(name, meta[name], round(g, 1))
json.dump(meta, open(f'{OUT}/farm.json', 'w'), indent=0)
