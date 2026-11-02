export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function readJson(request: Request): Promise<unknown> {
  const limit = 48 * 1024;
  if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) throw new HttpError(415, 'Vui lòng gửi dữ liệu JSON.');
  if (Number(request.headers.get('Content-Length') || 0) > limit) throw new HttpError(413, 'Dữ liệu gửi lên quá lớn.');
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, 'Dữ liệu gửi lên không hợp lệ.');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) { await reader.cancel(); throw new HttpError(413, 'Dữ liệu gửi lên quá lớn.'); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, 'Dữ liệu JSON không hợp lệ.');
  } finally { reader.releaseLock(); }
}
