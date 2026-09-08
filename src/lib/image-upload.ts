export async function uploadProductImage(file: File, productId: string) {
  if (file.size > 20 * 1024 * 1024) throw Error('图片不能超过20MB');
  const r = await fetch('/api/images', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'upload', id: productId, mime: file.type }),
  });
  const j = await r.json();
  if (!r.ok) throw Error(j.error);
  const put = await fetch(j.url, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });
  if (!put.ok) throw Error('图片上传失败，请检查对象存储');
  const complete = await fetch('/api/images', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'complete', id: j.id }),
  });
  const result = await complete.json();
  if (!complete.ok) throw Error(result.error);
}
