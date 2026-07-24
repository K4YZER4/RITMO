export function validationMessage(code: string, message: string): string {
  return JSON.stringify({ code, message });
}
