"""Chicken voices, built from how real calls are made: the syrinx buzzes at a pitch that wobbles (jitter) and pulses
unevenly (shimmer), the throat and beak shape that buzz into a couple of resonances (formants) that move as the beak
opens and shuts, breath noise rides along, and loud calls break into rough, doubled pitch (subharmonics). Each call is
then placed outdoors with a short, soft echo.
Writes r/snd/*.wav (one per call) and r/snd/sheet.wav + sheet.json (all calls in one file, for the game).
Usage: python3 synth_chickens.py"""
import os, json, numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt, fftconvolve

SR = 44100
rng = np.random.default_rng(7)
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'r', 'snd'); os.makedirs(OUT, exist_ok=True)


def smooth_noise(n, rate, amount):
    """Slowly wandering random curve (for jitter / shimmer): noise held at `rate` per second, smoothed."""
    k = max(2, int(n * rate / SR) + 2)
    pts = rng.standard_normal(k)
    x = np.interp(np.linspace(0, k - 1, n), np.arange(k), pts)
    return x * amount


def curve(n, pts):
    """Piecewise curve through (fraction of duration, value) points, eased."""
    xs = np.array([p[0] for p in pts]); ys = np.array([p[1] for p in pts])
    t = np.linspace(0, 1, n)
    return np.interp(t, xs, ys)


def formant_gain(f, F, B):
    return 1.0 / np.sqrt(1.0 + ((f - F) / (B / 2)) ** 2)


def voice(dur, f0, formants, amp, tilt=-8.0, jitter=0.025, shimmer=0.12, breath=0.08, rough=None, max_f=7000,
          sub=None, am=None):
    """One voiced call.
    f0: array (Hz per sample) or curve points; formants: list of (F curve points, bandwidth, gain);
    amp: amplitude envelope points; rough: curve points 0..1 of how much the voice breaks up (subharmonics + rasp)."""
    n = int(dur * SR)
    f = curve(n, f0) if isinstance(f0, list) else f0
    f = f * (1 + smooth_noise(n, 40, jitter) + smooth_noise(n, 9, jitter * .6))
    a = curve(n, amp) * (1 + smooth_noise(n, 55, shimmer)).clip(0.2, 2)
    if am is not None:          # pulsing (a purr or trill)
        rate, depth = am
        ph = np.cumsum(2 * np.pi * rate * (1 + smooth_noise(n, 6, .15)) / SR)
        a = a * (1 - depth * (0.5 + 0.5 * np.sin(ph)))
    r = curve(n, rough) if rough is not None else np.zeros(n)
    Fs = [(curve(n, Fp), B, g) for Fp, B, g in formants]
    phase = np.cumsum(2 * np.pi * f / SR)
    y = np.zeros(n)
    kmax = int(max_f / max(80.0, f.min()))
    for k in range(1, kmax + 1):
        fk = k * f
        h = sum(g * formant_gain(fk, F, B) for F, B, g in Fs)
        h = h * (k ** (tilt / 6.02))           # spectral tilt in dB per octave
        h = np.where(fk < max_f, h, 0)
        y += h * np.sin(k * phase + rng.uniform(0, 6.28))
    if r.max() > 0:             # the voice breaking: half-pitch partials and a buzzy amplitude flutter
        sub_ph = phase / 2
        for k in range(1, kmax * 2 + 1, 2):
            fk = k * f / 2
            h = sum(g * formant_gain(fk, F, B) for F, B, g in Fs) * ((k / 2) ** (tilt / 6.02)) * 0.7
            y += r * h * np.sin(k * sub_ph + rng.uniform(0, 6.28))
        flutter = 1 + r * 0.6 * smooth_noise(n, 180, 1.0)
        y *= flutter
    # breath noise through the same resonances
    nz = rng.standard_normal(n)
    spec = np.fft.rfft(nz); fr = np.fft.rfftfreq(n, 1 / SR)
    Fm = [(np.mean(Fp), B, g) for Fp, B, g in Fs]
    spec *= sum(g * formant_gain(fr, F, B * 1.6) for F, B, g in Fm)
    nz = np.fft.irfft(spec, n); nz /= (np.abs(nz).max() + 1e-9)
    y = y / (np.abs(y).max() + 1e-9) + nz * (breath + 0.5 * breath * r)
    return y * a


def click(n_ms=6, f=3500, amp=0.25):
    n = int(n_ms * SR / 1000)
    z = rng.standard_normal(n) * np.exp(-np.linspace(0, 6, n))
    sos = butter(2, [f * .6, min(f * 1.6, 16000)], 'bandpass', fs=SR, output='sos')
    return sosfilt(sos, z) * amp


def place(y, wet=0.18, tail=0.28, lp=None):
    """Outdoors: a near-ground early reflection and a short soft tail; a gentle roll-off of the top end."""
    n = int(tail * SR)
    ir = np.zeros(n); ir[0] = 1.0
    d = int(0.011 * SR); ir[d] += 0.35                       # bounce off the ground
    decay = rng.standard_normal(n) * np.exp(-np.linspace(0, 7, n)) * wet
    decay[:int(.006 * SR)] = 0
    sos = butter(2, 2600, 'lowpass', fs=SR, output='sos'); decay = sosfilt(sos, decay)
    ir += decay
    y = fftconvolve(y, ir)[:len(y) + n]
    if lp:
        y = sosfilt(butter(2, lp, 'lowpass', fs=SR, output='sos'), y)
    y = sosfilt(butter(2, 140, 'highpass', fs=SR, output='sos'), y)
    return y


def norm(y, peak=0.9):
    return y / (np.abs(y).max() + 1e-9) * peak


def cat(parts):
    """parts: list of (start seconds, signal)."""
    end = max(s + len(x) / SR for s, x in parts)
    y = np.zeros(int(end * SR) + 1)
    for s, x in parts:
        i = int(s * SR); y[i:i + len(x)] += x
    return y


# ---------------------------------------------------------------- the calls
def buk(f0=360, dur=None, loud=1.0, kind='buk'):
    """The hen's everyday cluck: a short throaty 'buk' (pitch falls, beak opens then shuts; a 'k' stop at the end)."""
    dur = dur or rng.uniform(.065, .11)
    j = rng.uniform(.93, 1.07)
    if kind == 'tuk':          # rooster's quick food call: lower, clipped
        fp = [(0, f0 * 1.12 * j), (.3, f0 * j), (1, f0 * .86 * j)]
        F1 = [(0, 520), (.4, 760), (1, 560)]
    else:
        fp = [(0, f0 * 1.28 * j), (.25, f0 * 1.02 * j), (1, f0 * .8 * j)]
        F1 = [(0, 600), (.35, 950 * rng.uniform(.92, 1.08)), (1, 650)]
    y = voice(dur, fp, [(F1, 380, 1.0), ([(0, 1700), (.4, 2150), (1, 1800)], 600, .55), ([(0, 3300), (1, 3300)], 900, .18)],
              [(0, 0), (.06, 1), (.55, .85), (.85, .5), (1, 0)], tilt=-7, jitter=.03, shimmer=.18, breath=.10)
    y[:len(c := click(5, 3000, .5))] += c                    # the beak opening
    return y * loud


def cluck_series(f0=None, n=None):
    f0 = f0 or rng.uniform(330, 420); n = n or int(rng.integers(2, 6))
    parts, t = [], 0.0
    for i in range(n):
        parts.append((t, buk(f0 * rng.uniform(.96, 1.05), loud=rng.uniform(.55, 1.0))))
        t += rng.uniform(.17, .32)
    return cat(parts)


def purr(f0=None):
    """The soft contented trill hens make while scratching about: low, pulsing 'brrrr'."""
    f0 = f0 or rng.uniform(240, 300); dur = rng.uniform(.45, .8)
    return voice(dur, [(0, f0 * 1.05), (.5, f0), (1, f0 * .92)],
                 [([(0, 620), (1, 700)], 420, 1.0), ([(0, 1650), (1, 1750)], 700, .4)],
                 [(0, 0), (.15, .8), (.7, .7), (1, 0)], tilt=-10, jitter=.02, shimmer=.1, breath=.06,
                 am=(rng.uniform(22, 30), .85)) * .55


def gawk(f0=None):
    """The long 'ba-GAAWK' that ends the egg song: rises fast, held, breaks up, falls away."""
    f0 = f0 or rng.uniform(430, 500); dur = rng.uniform(.42, .6)
    y = voice(dur, [(0, f0), (.18, f0 * 1.6), (.55, f0 * 1.52), (1, f0 * 1.15)],
              [([(0, 800), (.2, 1350), (.8, 1250), (1, 900)], 500, 1.0), ([(0, 2200), (.3, 2700), (1, 2300)], 800, .6),
               ([(0, 3600), (1, 3600)], 1000, .25)],
              [(0, 0), (.08, .8), (.2, 1), (.7, .9), (1, 0)], tilt=-5, jitter=.035, shimmer=.2, breath=.12,
              rough=[(0, 0), (.2, .35), (.5, .5), (.8, .3), (1, .1)])
    return y


def egg_song():
    """'buk buk buk buk, buk, ba-GAAWK' — speeding up into the long call, sometimes twice."""
    f0 = rng.uniform(380, 440); parts, t = [], 0.0
    for rep in range(int(rng.integers(1, 3))):
        n = int(rng.integers(3, 6))
        for i in range(n):
            parts.append((t, buk(f0 * rng.uniform(1.0, 1.12), dur=rng.uniform(.06, .085), loud=rng.uniform(.7, 1.0))))
            t += rng.uniform(.16, .22) * (1 - .06 * i)
        t += .04
        parts.append((t, buk(f0 * 1.15, dur=.05, loud=.8))); t += .09        # the 'ba-'
        g = gawk(f0 * rng.uniform(1.05, 1.15)); parts.append((t, g)); t += len(g) / SR + rng.uniform(.25, .45)
    return cat(parts)


def crow(f0=None):
    """Cock-a-doodle-doo: four syllables, harsh and loud, the last one long, rising a touch, then dropping off."""
    f0 = f0 or rng.uniform(430, 520)
    syl = [  # duration, pitch points (fraction, ratio), roughness, gap after
        (rng.uniform(.13, .17), [(0, .95), (.5, 1.05), (1, .98)], .25, .05),
        (rng.uniform(.07, .1), [(0, 1.0), (1, 1.08)], .15, .04),
        (rng.uniform(.16, .22), [(0, 1.1), (.4, 1.25), (1, 1.18)], .3, .045),
        (rng.uniform(.8, 1.15), [(0, 1.18), (.15, 1.32), (.65, 1.3), (.88, 1.12), (1, .82)], .45, 0),
    ]
    parts, t = [], 0.0
    for d, pp, rough, gap in syl:
        fp = [(x, f0 * r) for x, r in pp]
        y = voice(d, fp,
                  [([(0, 900), (.3, 1300), (1, 1100)], 600, 1.0), ([(0, 2300), (1, 2600)], 900, .7), ([(0, 3700), (1, 3900)], 1100, .3)],
                  [(0, 0), (.05, .9), (.25, 1), (.8, .9), (1, 0)], tilt=-4.5, jitter=.03, shimmer=.16, breath=.14,
                  rough=[(0, rough * .6), (.3, rough), (.75, rough * 1.1), (1, rough * .5)])
        parts.append((t, y)); t += d + gap
    return cat(parts)


def peep(kind='happy'):
    """A chick's peep: a clear whistle; happy ones rise, worried ones fall."""
    dur = rng.uniform(.07, .13); f = rng.uniform(3300, 4100)
    fp = [(0, f * .74), (.55, f * 1.1), (.8, f * 1.13), (1, f * 1.02)] if kind == 'happy' else [(0, f * 1.15), (.25, f * 1.05), (1, f * .7)]
    y = voice(dur, fp, [([(0, f), (1, f)], 2500, 1.0)], [(0, 0), (.15, 1), (.75, .8), (1, 0)], tilt=-18, jitter=.008,
              shimmer=.06, breath=.015, max_f=12000)
    return y


def peeps(n=None):
    n = n or int(rng.integers(2, 5)); parts, t = [], 0.0
    for i in range(n):
        parts.append((t, peep('happy' if rng.random() < .8 else 'sad') * rng.uniform(.6, 1))); t += rng.uniform(.12, .22)
    return cat(parts)


# ---------------------------------------------------------------- build the set
SET = {
    'cluck': [lambda: cluck_series() for _ in range(10)],
    'tuk': [lambda: cat([(i * rng.uniform(.12, .16), buk(rng.uniform(250, 290), dur=rng.uniform(.045, .065), loud=rng.uniform(.7, 1), kind='tuk')) for i in range(int(rng.integers(3, 7)))]) for _ in range(5)],
    'purr': [purr for _ in range(5)],
    'egg': [egg_song for _ in range(4)],
    'crow': [crow for _ in range(5)],
    'peep': [peeps for _ in range(8)],
}
LOUD = {'cluck': .8, 'tuk': .75, 'purr': .5, 'egg': .95, 'crow': .95, 'peep': .55}
GAP = 0.35
sheet, meta, n = [np.zeros(int(GAP * SR))], {}, int(GAP * SR)
for name, makers in SET.items():
    meta[name] = []
    for i, mk in enumerate(makers):
        y = norm(place(mk(), wet=.12 if name in ('crow', 'egg') else .05, tail=.3 if name in ('crow', 'egg') else .14), LOUD[name])
        wavfile.write(os.path.join(OUT, f'{name}_{i}.wav'), SR, (y * 32767).astype(np.int16))
        meta[name].append([round(n / SR, 4), round(len(y) / SR, 4)])
        sheet += [y, np.zeros(int(GAP * SR))]; n += len(y) + int(GAP * SR)
full = np.concatenate(sheet)
wavfile.write(os.path.join(OUT, 'sheet.wav'), SR, (full * 32767).astype(np.int16))
json.dump(meta, open(os.path.join(OUT, 'sheet.json'), 'w'))
print('sheet seconds', round(len(full) / SR, 1), {k: len(v) for k, v in meta.items()})
