export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const MIN_PASSWORD_LENGTH = 6;

export const isValidPassword = (password: string): boolean =>
  password.length >= MIN_PASSWORD_LENGTH;

const SPECIAL_PASSWORD_CHARACTERS = "!@#$%^&*()_+-=[]{};':\"|<>?,./`~";

export const isValidRegistrationPassword = (password: string): boolean =>
  isValidPassword(password)
  && /[a-z]/.test(password)
  && /[A-Z]/.test(password)
  && /\d/.test(password)
  && Array.from(password).some((character) => SPECIAL_PASSWORD_CHARACTERS.includes(character));