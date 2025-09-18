// Next.js API route for proxying image downloads to bypass CORS
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const imageUrl = searchParams.get('url');
  if (!imageUrl) {
    return new Response('Missing url parameter', { status: 400 });
  }
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      return new Response('Failed to fetch image', { status: 502 });
    }
    // Copy content-type and content-disposition for download
    const headers = new Headers();
    headers.set('Content-Type', response.headers.get('Content-Type') || 'application/octet-stream');
    headers.set('Content-Disposition', response.headers.get('Content-Disposition') || 'attachment');
    return new Response(response.body, { status: 200, headers });
  } catch (err) {
    return new Response('Proxy error', { status: 500 });
  }
}
