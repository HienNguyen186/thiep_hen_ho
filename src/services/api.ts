export class ApiError extends Error { constructor(message: string, public status: number) { super(message); } }
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: globalThis.Response;
  try { response = await fetch(`/api${path}`, { ...options, credentials: 'same-origin', headers: { 'Content-Type': 'application/json', ...options.headers } }); }
  catch { throw new ApiError('Chưa kết nối được máy chủ. Em kiểm tra mạng rồi thử lại nhé.', 0); }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(data.error || 'Có lỗi xảy ra. Vui lòng thử lại.', response.status);
  return data as T;
}
