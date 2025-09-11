import Script from 'next/script'

const GoogleAnalytics = () => (
  <>
    {/* Google tag (gtag.js) */}
    <Script
      strategy="afterInteractive"
      src="https://www.googletagmanager.com/gtag/js?id=G-DS5M94M39M"
    />
    <Script id="google-analytics" strategy="afterInteractive">
      {`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-DS5M94M39M');
      `}
    </Script>
  </>
)

export default GoogleAnalytics