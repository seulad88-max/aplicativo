// O site não tem credenciais: todo o catálogo vem do servidor de API do FluxoPrime.
//
// Para apontar para outro servidor, defina VITE_API_BASE no build da hospedagem:
//   VITE_API_BASE="https://minha-api.com" npm run build:static
//
// Endereço padrão (API publicada do FluxoPrime).
const DEFAULT_API_BASE = "https://sweet-server-connect.lovable.app";

const configured = import.meta.env["VITE_API_BASE"];

export const API_BASE = (
  typeof configured === "string" && configured.trim() !== "" ? configured : DEFAULT_API_BASE
).replace(/\/+$/, "");
