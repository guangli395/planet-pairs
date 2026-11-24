/** One delegated listener covers current buttons and buttons created by dialogs. */
export function installButtonFeedback(root: Document, play: () => void, enabled: () => boolean) {
  const onClick = (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof root.defaultView!.Element)) return;
    const button = (target as Element).closest('button');
    if (!button || button.matches(':disabled') || button.getAttribute('aria-disabled') === 'true') return;
    if (enabled()) play();
    else {
      // Turning sound on should acknowledge the change after its handler runs.
      root.defaultView!.setTimeout(() => { if (enabled()) play(); }, 0);
    }
  };
  root.addEventListener('click', onClick, {capture: true});
  return () => root.removeEventListener('click', onClick, {capture: true});
}
