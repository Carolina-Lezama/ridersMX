// Archivos para conectarte a tu base de datos externa/API

const BASE_URL = 'https://tu-api-backend.com/api';

export const loginUser = async (correo: string, pass: string) => {
  // Aquí irá la lógica de conexión a la BD en el futuro
  console.log("Simulando conexión a DB para:", correo);
  return { success: true, token: '123456' };
};