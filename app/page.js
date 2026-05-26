import fs from "node:fs";
import path from "node:path";
import Script from "next/script";

export default function Page() {
  const legacyHtml = getLegacyBodyHtml();

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            html, body { overflow-x: hidden; }
            .secondary-row { overflow: hidden; flex-wrap: wrap; }
          `,
        }}
      />
      <div dangerouslySetInnerHTML={{ __html: legacyHtml }} />
      <Script src="/assets/vendor/xlsx.full.min.js" strategy="afterInteractive" />
      <Script src="/js/config.js" strategy="afterInteractive" />
      <Script src="/js/excel.js" strategy="afterInteractive" />
      <Script src="/js/supabase-env.js" strategy="afterInteractive" />
      <Script src="/js/portal.js" strategy="afterInteractive" />
      <Script src="/js/app.js" strategy="afterInteractive" />
    </>
  );
}

function getLegacyBodyHtml() {
  const htmlPath = path.join(process.cwd(), "index.html");
  const html = fs.readFileSync(htmlPath, "utf8");
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (!bodyMatch) return "";

  return bodyMatch[1]
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .trim();
}
