// Anti-cheat ringan untuk ujian (client-side, deteksi bukan pencegahan).
// CATATAN: aplikasi web TIDAK bisa benar-benar mengunci OS/browser. Modul ini
// hanya mendeteksi & menggentar: keluar dari tab, keluar layar penuh, serta
// memblokir salin/potong/klik-kanan agar soal sulit disalin ke tempat lain.
// Untuk penguncian sungguhan butuh aplikasi native / kiosk / perangkat terkelola.

export interface AntiCheatOptions {
  /** Elemen ujian — di sini klik-kanan & salin dipasung. */
  container?: HTMLElement | null;
  /** Batas pelanggaran sebelum onForceSubmit dipanggil. 0 = tidak auto-submit. */
  maxViolations?: number;
  /** Paksa mode layar penuh saat mulai & kembalikan bila keluar. */
  requireFullscreen?: boolean;
  /** Dipanggil tiap ada pelanggaran (count, alasan). */
  onViolation?: (count: number, reason: string) => void;
  /** Dipanggil bila pelanggaran >= maxViolations. */
  onForceSubmit?: () => void;
  enabled?: boolean;
}

export class AntiCheat {
  violations = 0;
  private opts: Required<Omit<AntiCheatOptions, 'container' | 'onViolation' | 'onForceSubmit'>> &
    Pick<AntiCheatOptions, 'container' | 'onViolation' | 'onForceSubmit'>;
  private winHandlers: Array<[string, EventListener]> = [];
  private destroyFns: Array<() => void> = [];

  constructor(opts: AntiCheatOptions = {}) {
    this.opts = {
      maxViolations: 0,
      requireFullscreen: false,
      enabled: true,
      ...opts
    } as any;
  }

  start() {
    if (!this.opts.enabled || typeof document === 'undefined' || typeof window === 'undefined') return;

    // Keluar dari tab / jendela (Alt+Tab, klik notifikasi, ganti aplikasi).
    const onVisibility = () => {
      if (document.hidden) this.violate('Keluar dari ujian (tab/jendela tidak aktif)');
    };
    document.addEventListener('visibilitychange', onVisibility);
    this.winHandlers.push(['visibilitychange-doc', onVisibility as EventListener]);

    // Layar penuh: minta saat mulai, catat bila keluar.
    if (this.opts.requireFullscreen) {
      this.requestFullscreen();
      const onFs = () => {
        if (!document.fullscreenElement) {
          this.violate('Keluar dari mode layar penuh');
          this.requestFullscreen();
        }
      };
      document.addEventListener('fullscreenchange', onFs);
      this.winHandlers.push(['fullscreenchange', onFs]);
    }

    // Pasung salin / potong / klik-kanan di area ujian (soal tidak mudah disalin).
    // Paste dibiarkan agar mengetik esai tetap nyaman.
    if (this.opts.container) {
      const c = this.opts.container;
      const block = (e: Event) => e.preventDefault();
      (['contextmenu', 'copy', 'cut'] as const).forEach((ev) => {
        c.addEventListener(ev, block as EventListener, { capture: true });
        this.destroyFns.push(() => c.removeEventListener(ev, block as EventListener, { capture: true }));
      });
    }
  }

  private requestFullscreen() {
    const el = document.documentElement as any;
    const fn = el.requestFullscreen || el.webkitRequestFullscreen;
    try {
      fn?.call(el);
    } catch {
      /* diabaikan: butuh gestur pengguna di beberapa browser */
    }
  }

  private violate(reason: string) {
    this.violations++;
    this.opts.onViolation?.(this.violations, reason);
    if (this.opts.maxViolations > 0 && this.violations >= this.opts.maxViolations) {
      this.opts.onForceSubmit?.();
    }
  }

  destroy() {
    for (const [ev, fn] of this.winHandlers) {
      if (ev === 'visibilitychange-doc') document.removeEventListener('visibilitychange', fn);
      else document.removeEventListener(ev, fn);
    }
    this.winHandlers = [];
    for (const d of this.destroyFns) d();
    this.destroyFns = [];
  }
}
