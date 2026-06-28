import api from './index'

export interface LoginResponse {
  token: string
  user: { id: string; email: string; name: string; role: string }
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/login', { email, password })
  return data
}
