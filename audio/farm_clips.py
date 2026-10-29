# The farm's sounds for the game (Audrey, 29 Oct: "All good, put them in"), cut from the BigSoundBank recordings (CC0):
# one-shots (each a little phrase, mono, -18 LUFS, soft ends) and the beds (seamless loops, mono, -22 LUFS).
# Out: web3d/audio/farm/*.mp3 and farm.json (each clip's length; the egg songs' clucks and ba-KAWKs, for the hens' singing).
import json, os, subprocess, numpy as np, scipy.io.wavfile as wf, scipy.signal as ss
SRC = '/tmp/claude-0/farmer/sfxwork'; OUT = '/home/claude/ff-source/web3d/audio/farm'; TMP = SRC + '/clips'
os.makedirs(OUT, exist_ok=True); os.makedirs(TMP, exist_ok=True)
def load(i):
    sr, x = wf.read(f'{SRC}/s{i}.wav'); return sr, x.astype(np.float32) / 32768
def lufs(path):
    out = subprocess.run(['ffmpeg', '-hide_banner', '-i', path, '-af', 'ebur128=framelog=quiet', '-f', 'null', '-'], capture_output=True, text=True).stderr
    for line in out.splitlines()[::-1]:
        if line.strip().startswith('I:'): return float(line.split()[1])
def save(name, y, sr, target, rate=44100, kbps=80):
    fi, fo = int(0.012 * sr), int(0.08 * sr)
    y = y.copy(); y[:fi] *= np.linspace(0, 1, fi); y[-fo:] *= np.linspace(1, 0, fo) ** 1.5
    tmp = f'{TMP}/{name}.wav'; wf.write(tmp, sr, (np.clip(y, -1, 1) * 32767).astype(np.int16))
    g = target - lufs(tmp)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-af', f'volume={g:.2f}dB,alimiter=limit=0.89:level=false', '-ac', '1', '-ar', str(rate), '-c:a', 'libmp3lame', '-b:a', f'{kbps}k', '-map_metadata', '-1', f'{OUT}/{name}.mp3'], check=True)
    return round(len(y) / sr, 3)
def cut(i, a, b, hp=0):
    sr, x = load(i); y = x[int(a * sr):int(b * sr)]
    if hp: y = ss.sosfiltfilt(ss.butter(2, hp, 'highpass', fs=sr, output='sos'), y).astype(np.float32)
    return y, sr
M = {}
# the egg songs ("Hen lays #1", 0975: one hen, "buk buk buk buk ba-KAWK"), one a personality, as long as her song
CL = [10.24, 10.74, 11.0, 11.26, 11.53, 12.62, 12.9, 13.14, 13.38, 13.64, 13.93, 15.18, 15.42, 15.68, 15.95, 16.2]
KW = [(11.78, 12.26), (14.19, 14.72), (16.46, 16.97)]
for pers, (a, b) in {'rebel': (10.4, 12.4), 'glutton': (14.9, 17.1), 'mum': (12.25, 14.85), 'brave': (13.5, 17.1), 'diva': (10.35, 14.85)}.items():
    y, sr = cut('0975', a, b, 120); n = f'egg_{pers}'
    M[n] = {'len': save(n, y, sr, -18), 'clucks': [round(c - a, 2) for c in CL if a <= c < b - 0.1], 'kawks': [[round(p - a, 2), round(q - a, 2)] for p, q in KW if a <= p and q <= b]}
# the rooster (Cock Song #1, Rooster Song)
for n, (i, a, b) in {'crow1': ('0440', 0.0, 2.25), 'crow2': ('0283', 0.0, 2.35)}.items():
    y, sr = cut(i, a, b, 120); M[n] = {'len': save(n, y, sr, -17)}
# the fox's visit: the henhouse in a flurry ("Henhouse")
for n, (a, b) in {'flurry1': (0.25, 4.45), 'flurry2': (9.2, 13.45)}.items():
    y, sr = cut('0282', a, b, 120); M[n] = {'len': save(n, y, sr, -18)}
# a mummy hen talking to her chicks ("Hens worried", 1039) and chicks ("Chick that chirp", 0672)
for k, (a, b) in enumerate([(0.0, 6.35), (7.7, 12.95), (12.95, 18.9), (19.4, 25.6)]):
    y, sr = cut('1039', a, b, 120); M[f'mum{k + 1}'] = {'len': save(f'mum{k + 1}', y, sr, -22)}
for k, (a, b) in enumerate([(3.0, 9.3), (9.4, 15.6), (15.7, 21.8), (22.0, 28.0)]):
    y, sr = cut('0672', a, b, 150); M[f'chicks{k + 1}'] = {'len': save(f'chicks{k + 1}', y, sr, -24)}
# the ducks: little phrases of two or three quacks ("Ducks", 0276)
for k, (a, b) in enumerate([(0.3, 1.2), (7.5, 8.45), (1.18, 2.75), (4.15, 6.35), (9.65, 11.15)]):
    y, sr = cut('0276', a, b, 150); M[f'quack{k + 1}'] = {'len': save(f'quack{k + 1}', y, sr, -20)}
# Biscuit: one woof each ("Old dog barking #1", 2352)
for k, (a, b) in enumerate([(0.2, 0.75), (1.45, 2.0), (2.65, 3.2), (3.8, 4.35), (5.0, 5.55)]):
    y, sr = cut('2352', a, b, 120); M[f'bark{k + 1}'] = {'len': save(f'bark{k + 1}', y, sr, -19)}
# the beds: 45 seconds each, the end faded into the start so it loops without a seam
def bed(name, i, a, secs=45, xf=3, hp=150, notch=None):
    sr, x = load(i); y = x[int(a * sr):int((a + secs + xf) * sr)].copy()
    y = ss.sosfiltfilt(ss.butter(2, hp, 'highpass', fs=sr, output='sos'), y)
    if notch:                                              # (a steady cricket whistle made gentler)
        b_, a_ = ss.iirpeak(notch, 3, fs=sr); y = y - 0.5 * ss.filtfilt(b_, a_, y)
    n = int(xf * sr); f = np.linspace(0, np.pi / 2, n)
    y[:n] = y[:n] * np.sin(f) + y[-n:] * np.cos(f); y = y[:-n].astype(np.float32)
    tmp = f'{TMP}/{name}.wav'; wf.write(tmp, sr, (np.clip(y, -1, 1) * 32767).astype(np.int16)); g = -22 - lufs(tmp)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-af', f'volume={g:.2f}dB,alimiter=limit=0.89:level=false', '-ac', '1', '-ar', '32000', '-c:a', 'libmp3lame', '-b:a', '64k', '-map_metadata', '-1', f'{OUT}/{name}.mp3'], check=True)
    M[name] = {'len': round(len(y) / sr, 3), 'bed': True}
bed('dawn', '0222', 30); bed('day', '1911', 20, notch=4700); bed('evening', '1859', 30); bed('night', '0110', 30, hp=200); bed('pond', '0691', 95)
json.dump(M, open(f'{OUT}/farm.json', 'w'), indent=0)
for k, v in M.items(): print(k, v)
print(subprocess.run(['du', '-sh', OUT], capture_output=True, text=True).stdout)
