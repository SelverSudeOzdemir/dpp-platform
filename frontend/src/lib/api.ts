const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1"

export async function fetchDPP(publicId: string) {
  const res = await fetch(`${BASE_URL}/dpp/${publicId}`)
  if (!res.ok) throw new Error("DPP bulunamadı")
  return res.json()
}

export async function fetchProducts() {
  const res = await fetch(`${BASE_URL}/products`)
  if (!res.ok) throw new Error("Ürünler alınamadı")
  return res.json()
}
