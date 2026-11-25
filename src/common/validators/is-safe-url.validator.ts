import { registerDecorator, ValidationOptions } from 'class-validator';

/**
 * Validador de seguridad contra SSRF (Server-Side Request Forgery).
 * Verifica que una URL sea pública y válida, bloqueando:
 * - Hosts locales (localhost, 127.0.0.1, 0.0.0.0, ::1)
 * - Direcciones IP de metadatos de Cloud (169.254.169.254 / link-local)
 * - Rangos de direcciones IP privadas RFC 1918 (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
 * - Hosts internos de Docker / Kubernetes (*.local, *.internal, postgres, ritmo-api, etc.)
 * - Protocolos que no sean http o https
 */
export function isSafeUrlString(urlStr: string): boolean {
  if (typeof urlStr !== 'string' || !urlStr.trim()) return false;

  try {
    const parsed = new URL(urlStr.trim());

    // 1. Solo protocolos HTTP y HTTPS permitidos
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }

    const hostname = parsed.hostname.toLowerCase();

    // 2. Bloqueo de loopback y localhost
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname === '[::1]' ||
      hostname.startsWith('127.')
    ) {
      return false;
    }

    // 3. Bloqueo de metadata cloud (AWS, GCP, Azure, DigitalOcean)
    if (hostname === '169.254.169.254' || hostname.startsWith('169.254.')) {
      return false;
    }

    // 4. Bloqueo de rangos privados RFC 1918
    // 10.0.0.0/8
    if (hostname.startsWith('10.')) {
      return false;
    }
    // 192.168.0.0/16
    if (hostname.startsWith('192.168.')) {
      return false;
    }
    // 172.16.0.0/12 (172.16.x.x - 172.31.x.x)
    const match172 = hostname.match(/^172\.(\d+)\./);
    if (match172) {
      const secondOctet = parseInt(match172[1], 10);
      if (secondOctet >= 16 && secondOctet <= 31) {
        return false;
      }
    }

    // 5. Bloqueo de nombres internos de red
    if (
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal') ||
      hostname.endsWith('.localhost') ||
      hostname === 'host.docker.internal' ||
      hostname === 'gateway.docker.internal' ||
      hostname === 'postgres' ||
      hostname === 'database' ||
      hostname === 'ritmo-api' ||
      !hostname.includes('.')
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export function IsSafeUrl(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isSafeUrl',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions || {
        message:
          'La URL proporcionada no es segura o apunta a un recurso privado/interno (SSRF Protection).',
      },
      validator: {
        validate(value: unknown) {
          if (value === undefined || value === null || value === '') return true; // Opcional si está vacío
          if (typeof value !== 'string') return false;
          return isSafeUrlString(value);
        },
      },
    });
  };
}
