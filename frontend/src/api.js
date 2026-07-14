/** SmartSprout API client — configurable base for mobile/LAN. */
export const API_BASE =
  import.meta.env.VITE_API_BASE ||
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost'
    ? `${window.location.protocol}//${window.location.hostname}:8000/api/v1`
    : 'http://localhost:8000/api/v1');

export function authHeaders(token, extra = {}) {
  return {
    Authorization: `Bearer ${token}`,
    ...extra,
  };
}

export async function apiJson(path, { token, method = 'GET', body, headers = {} } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? authHeaders(token) : {}),
      ...headers,
    },
    body: body instanceof FormData ? body : body != null ? JSON.stringify(body) : undefined,
  });
  let data = null;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { detail: text };
  }
  if (!res.ok) {
    const detail = data?.detail;
    const msg = typeof detail === 'string' ? detail : Array.isArray(detail) ? detail.map(d => d.msg || JSON.stringify(d)).join(', ') : res.statusText;
    throw new Error(msg || 'Request failed');
  }
  return data;
}

/** Compress image client-side for faster vision uploads. */
export function compressImage(file, maxSide = 1280, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      let { width, height } = img;
      const scale = Math.min(1, maxSide / Math.max(width, height));
      width = Math.round(width * scale);
      height = Math.round(height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error('Image compress failed'));
          resolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg') || 'meal.jpg', { type: 'image/jpeg' }));
        },
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not load image'));
    };
    img.src = url;
  });
}

export async function identifyFoodPhoto(token, file) {
  const compressed = await compressImage(file);
  const fd = new FormData();
  fd.append('file', compressed);
  return apiJson('/foods/identify', { token, method: 'POST', body: fd });
}

export async function batchLogFoods(token, items, mealName) {
  return apiJson('/food-logs/batch', {
    token,
    method: 'POST',
    body: {
      meal_name: mealName || null,
      items: items.map((it) => ({
        food_id: it.food_id,
        quantity: it.estimated_quantity ?? it.quantity,
        unit: it.unit,
        meal_name: it.meal_name || mealName || null,
      })),
    },
  });
}

export async function pollPlanStatus(token, taskId, { intervalMs = 1500, maxWaitMs = 180000 } = {}) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const status = await apiJson(`/generate-plan/status/${taskId}`, { token });
    if (status.status === 'completed' || status.status === 'failed') return status;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error('Plan generation timed out');
}

export async function listChatSessions(token) {
  return apiJson('/chat/sessions', { token });
}

export async function createChatSession(token, title) {
  return apiJson('/chat/sessions', { token, method: 'POST', body: { title } });
}

export async function deleteChatSession(token, sessionId) {
  return apiJson(`/chat/sessions/${sessionId}`, { token, method: 'DELETE' });
}

export async function getChatSessionMessages(token, sessionId) {
  return apiJson(`/chat/sessions/${sessionId}/messages`, { token });
}
