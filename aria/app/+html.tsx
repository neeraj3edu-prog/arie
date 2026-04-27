import { ScrollViewStyleReset } from 'expo-router/html';

export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        {/* viewport-fit=cover lets content extend under iOS notch/home indicator */}
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />
        {/* PWA meta tags so it feels native when bookmarked */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#0a0a0f" />

        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: globalStyles }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const globalStyles = `
  /* Dark background — never flicker white on load */
  html, body {
    background-color: #0a0a0f;
    height: 100%;
    /* Use dynamic viewport height so the browser chrome doesn't cut off content */
    height: 100dvh;
  }

  /* Root view must fill the full dynamic viewport */
  #root {
    height: 100%;
    height: 100dvh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  /* Smooth momentum scrolling on iOS Safari for all scroll containers */
  * {
    -webkit-overflow-scrolling: touch;
  }

  /* Prevent pull-to-refresh interfering with in-app scroll */
  body {
    overscroll-behavior-y: contain;
  }

  /* Remove tap highlight on mobile */
  * {
    -webkit-tap-highlight-color: transparent;
  }
`;
