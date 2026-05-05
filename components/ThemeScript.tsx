// Inlined before hydration to prevent a flash of the wrong theme.
export function ThemeScript() {
  const code = `
    try {
      var stored = localStorage.getItem('lfb:theme');
      var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      var dark = stored ? stored === 'dark' : prefersDark;
      if (dark) document.documentElement.classList.add('dark');
    } catch (_) {}
  `;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
