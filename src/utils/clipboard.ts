export async function copyText(text: string) {
  try {
    if (navigator.clipboard) {
      const copied = await Promise.race([
        navigator.clipboard.writeText(text).then(() => true),
        new Promise<boolean>(resolve => setTimeout(() => resolve(false), 1500)),
      ]);
      if (copied) return;
    }
  } catch { /* Some embedded browsers do not expose the asynchronous clipboard. */ }
  const field = document.createElement('textarea');
  field.value = text;
  field.setAttribute('aria-hidden', 'true');
  field.style.position = 'fixed';
  field.style.left = '-9999px';
  document.body.append(field);
  field.select();
  const copied = document.execCommand('copy');
  field.remove();
  if (!copied) throw new Error('Clipboard unavailable');
}
