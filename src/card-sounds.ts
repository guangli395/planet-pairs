export interface PrismSound {
  unlock(): void;
  setMuted(value: boolean): void;
  call(method: string, ...args: unknown[]): void;
  setProfile?(volume: number, flipWhoosh: boolean): void;
  readonly isMuted?: boolean;
}
interface SoundOptions {
  enabled: () => boolean;
  getContext: () => AudioContext;
  fallback?: () => void;
}

/** Reuse the very same MIT-licensed synth as the blessing pack, including its reverb. */
export function createCardSounds(options: SoundOptions) {
  let synth: PrismSound | null = null;
  const moduleUrl = new URL('./prism-blessing/sound.js', document.baseURI).href;
  const ready = import(/* @vite-ignore */ moduleUrl).then(module => {
    synth = module.createSoundController({muted: !options.enabled(), volume: .75, getContext: options.getContext, flipWhoosh: false}) as PrismSound;
    return synth;
  }).catch(() => null);

  function unlock() {
    if (!options.enabled()) return;
    // Resume in the original pointer event, before postMessage or an ad promise.
    try {
      const context = options.getContext();
      if (context.state === 'suspended') void context.resume().catch(() => {});
      synth?.unlock();
    } catch { /* Audio may be unavailable in a platform WebView. */ }
  }
  const packSound: PrismSound = {
    unlock,
    setMuted(value) { synth?.setMuted(value); },
    get isMuted() { return !options.enabled(); },
    call(method, ...args) {
      if (!options.enabled() && method !== 'setRip') return;
      synth?.setProfile?.(1.17, true);
      synth?.setMuted(!options.enabled());
      synth?.call(method, ...args);
    },
  };

  function play(slot: number) {
    if (!options.enabled()) return;
    const invoke = (engine: PrismSound | null) => {
      if (!options.enabled()) return;
      if (!engine) { options.fallback?.(); return; }
      engine.setProfile?.(.75, false); engine.setMuted(false); engine.unlock();
      const stereoSlot = slot < 0 ? 2 : slot % 3 * 2;
      engine.call('cardFlip', 'holo', stereoSlot);
    };
    if (synth) invoke(synth);
    else void ready.then(invoke);
  }
  return {
    ready,
    unlock,
    packSound,
    flip(slot = 4) { play(slot); },
    syncPreference() { synth?.setMuted(!options.enabled()); },
  };
}
