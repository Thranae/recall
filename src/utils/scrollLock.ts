let lockCount = 0;

export function lockBodyScroll(): () => void {
  lockCount++;
  if (lockCount === 1) {
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
  }

  let released = false;
  return () => {
    if (released) return;
    released = true;
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount === 0) {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
      document.documentElement.style.overflow = '';
      document.body.style.overscrollBehavior = '';
    }
  };
}
