// Anti-cheat untuk ujian (client-side).
// Mendeteksi: keluar tab/jendela, minimize, Alt+Tab, klik notifikasi.
// Mencegah: salin/potong/klik-kanan, navigasi back, popup alert + kembali otomatis.

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
  private winHandlers: Array<[string, EventListenerOrEventListenerObject]> = [];
  private destroyFns: Array<() => void> = [];
  private isSubmitting = false;

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

    // Push history state agar tombol back tidak keluar dari ujian
    history.pushState({ examLock: true }, '', location.href);
    const onPopState = (e: PopStateEvent) => {
      e.preventDefault();
      history.pushState({ examLock: true }, '', location.href);
      this.violate('Mencoba navigasi back');
      this.showWarning('Anda tidak diperbolehkan keluar dari halaman ujian!');
    };
    window.addEventListener('popstate', onPopState as EventListener);
    this.winHandlers.push(['popstate', onPopState as EventListener]);

    // Keluar dari tab / jendela (Alt+Tab, klik notifikasi, ganti aplikasi, minimize).
    const onVisibility = () => {
      if (document.hidden) {
        this.violate('Keluar dari ujian (tab/jendela tidak aktif)');
        this.showWarning('Anda meninggalkan halaman ujian! Segera kembali.');
        // Coba kembalikan fokus ke tab ini
        this.returnFocus();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    this.winHandlers.push(['visibilitychange', onVisibility]);

    // Deteksi blur window (Alt+Tab, minimize, switch aplikasi)
    const onBlur = () => {
      // Delay sedikit untuk menghindari false positive saat buka devtools
      setTimeout(() => {
        if (document.hidden) {
          // Sudah ditangani oleh visibilitychange
          return;
        }
        this.violate('Jendela ujian kehilangan fokus');
        this.showWarning('Anda meninggalkan halaman ujian! Segera kembali.');
        this.returnFocus();
      }, 200);
    };
    window.addEventListener('blur', onBlur as EventListener);
    this.winHandlers.push(['blur', onBlur as EventListener]);

    // Before unload — warning saat tutup/refresh
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload as EventListener);
    this.winHandlers.push(['beforeunload', onBeforeUnload as EventListener]);

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

    // Pasung salin / potong / klik-kanan di area ujian
    if (this.opts.container) {
      const c = this.opts.container;
      const block = (e: Event) => e.preventDefault();
      (['contextmenu', 'copy', 'cut'] as const).forEach((ev) => {
        c.addEventListener(ev, block as EventListener, { capture: true });
        this.destroyFns.push(() => c.removeEventListener(ev, block as EventListener, { capture: true }));
      });
    }
  }

  private showWarning(msg: string) {
    try { alert(msg); } catch { /* ignore */ }
  }

  private returnFocus() {
    try { window.focus(); } catch { /* ignore */ }
    // Second attempt after short delay (some browsers need this)
    setTimeout(() => {
      try { window.focus(); } catch { /* ignore */ }
    }, 500);
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
    if (this.opts.maxViolations > 0 && this.violations >= this.opts.maxViolations && !this.isSubmitting) {
      this.isSubmitting = true;
      this.showWarning('Anda telah melanggar aturan ujian sebanyak ' + this.violations + ' kali. Ujian akan dikumpulkan secara otomatis.');
      this.opts.onForceSubmit?.();
    }
  }

  destroy() {
    for (const [ev, fn] of this.winHandlers) {
      if (ev === 'visibilitychange') document.removeEventListener('visibilitychange', fn as EventListener);
      else if (ev === 'popstate') window.removeEventListener('popstate', fn as EventListener);
      else if (ev === 'blur') window.removeEventListener('blur', fn as EventListener);
      else if (ev === 'beforeunload') window.removeEventListener('beforeunload', fn as EventListener);
      else document.removeEventListener(ev, fn as EventListener);
    }
    this.winHandlers = [];
    for (const d of this.destroyFns) d();
    this.destroyFns = [];
  }
}
