import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function fixUtf8Mojibake(str: any): string {
  if (str === null || str === undefined) return '';
  let s = String(str).trim();
  if (!s) return '';

  try {
    if (/[\u00C0-\u00FF]/.test(s)) {
      const bytes = new Uint8Array(Array.from(s).map(c => c.charCodeAt(0)));
      const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      if (decoded && !decoded.includes('\uFFFD')) {
        s = decoded;
      }
    }
  } catch (e) {
    // Ignore decode error
  }

  return s
    .replace(/nÃºmero/gi, 'Número')
    .replace(/nâºmero/gi, 'Número')
    .replace(/nÃ\u00ba/gi, 'Nº')
    .replace(/gÃªnero/gi, 'Gênero')
    .replace(/gâªnero/gi, 'Gênero')
    .replace(/endereÃ§o/gi, 'Endereço')
    .replace(/regiÃ£o/gi, 'Região')
    .replace(/Ãº/g, 'ú').replace(/ÃŠ/g, 'Ê')
    .replace(/Ãª/g, 'ê').replace(/ÃŠ/g, 'Ê')
    .replace(/Ã§/g, 'ç').replace(/Ã‡/g, 'Ç')
    .replace(/Ã£/g, 'ã').replace(/Ã /g, 'Ã')
    .replace(/Ã¡/g, 'á').replace(/Ã /g, 'Á')
    .replace(/Ã©/g, 'é').replace(/Ã‰/g, 'É')
    .replace(/Ã­/g, 'í').replace(/Ã /g, 'Í')
    .replace(/Ã³/g, 'ó').replace(/Ã“/g, 'Ó')
    .replace(/Ãµ/g, 'õ').replace(/Ã•/g, 'Õ')
    .replace(/Ã¢/g, 'â').replace(/Ã /g, 'Â');
}

export function parseGender(val: any): string {
  if (!val) return '-';
  const fixed = fixUtf8Mojibake(val).trim();
  const upper = fixed.toUpperCase();
  if (upper === 'M' || upper.startsWith('M -') || upper.startsWith('MASC') || upper === 'MALE' || upper.includes('MASCULINO')) {
    return 'M';
  }
  if (upper === 'F' || upper.startsWith('F -') || upper.startsWith('FEM') || upper === 'FEMALE' || upper.includes('FEMININO') || upper.includes('FEMINIMO')) {
    return 'F';
  }
  return fixed;
}

export function maskDocument(doc?: string): string {
  if (!doc) return '';
  const clean = String(doc).trim();
  const digits = clean.replace(/\D/g, '');
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}.***.***-${digits.slice(9, 11)}`;
  }
  if (clean.length > 5) {
    const start = clean.slice(0, 3);
    const end = clean.slice(-2);
    return `${start}***${end}`;
  }
  return '***';
}

export function parseBirthDate(dobStr?: any): { day: number; month: number; year: number } | null {
  if (dobStr === null || dobStr === undefined || dobStr === '') return null;

  const rawStr = fixUtf8Mojibake(String(dobStr)).trim().replace(/['"]/g, '');
  if (!rawStr) return null;

  // Handle numbers or numeric strings (Excel serial numbers like 22067, 31963)
  const numVal = Number(rawStr);
  if (!isNaN(numVal) && !rawStr.includes('/') && !rawStr.includes('-') && !rawStr.includes('.')) {
    if (numVal > 1000 && numVal < 60000) {
      const dateObj = new Date(Math.round((numVal - 25569) * 86400 * 1000));
      if (!isNaN(dateObj.getTime())) {
        return {
          day: dateObj.getUTCDate(),
          month: dateObj.getUTCMonth() + 1,
          year: dateObj.getUTCFullYear()
        };
      }
    }
  }

  // Check ISO format e.g. "1987-07-05" or "1987-07-05T00:00:00.000Z"
  if (rawStr.includes('T') || (rawStr.includes('-') && rawStr.length >= 10 && rawStr.indexOf('-') === 4)) {
    const dObj = new Date(rawStr);
    if (!isNaN(dObj.getTime())) {
      return {
        day: dObj.getUTCDate(),
        month: dObj.getUTCMonth() + 1,
        year: dObj.getUTCFullYear()
      };
    }
  }

  // Matching DD/MM/YYYY, DD.MM.YYYY, DD-MM-YYYY or YYYY/MM/DD with optional whitespace
  const match = rawStr.match(/(\d{1,4})\s*[\/\-\.]\s*(\d{1,2})\s*[\/\-\.]\s*(\d{1,4})/);
  if (match) {
    const p1 = parseInt(match[1], 10);
    const p2 = parseInt(match[2], 10);
    const p3 = parseInt(match[3], 10);

    let day = 0, month = 0, year = 0;

    if (match[1].length === 4) {
      // YYYY/MM/DD
      year = p1;
      month = p2;
      day = p3;
    } else {
      // DD/MM/YYYY or DD/MM/YY
      day = p1;
      month = p2;
      year = p3;
      if (year < 100) {
        year = year <= 26 ? 2000 + year : 1900 + year;
      }
    }

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 1900 && year <= 2030) {
      return { day, month, year };
    }
  }

  return null;
}

export function getAge(dobStr?: any): number | null {
  if (dobStr === null || dobStr === undefined || dobStr === '') return null;

  const strVal = fixUtf8Mojibake(String(dobStr)).trim();
  if (!strVal) return null;

  // Direct age number (e.g. 25, 34, 52)
  const numVal = Number(strVal);
  if (!isNaN(numVal) && numVal >= 10 && numVal <= 110 && !strVal.includes('/') && !strVal.includes('-') && !strVal.includes('.')) {
    return Math.floor(numVal);
  }

  const parsed = parseBirthDate(dobStr);
  if (!parsed) return null;

  const today = new Date();
  let age = today.getFullYear() - parsed.year;
  const m = (today.getMonth() + 1) - parsed.month;
  if (m < 0 || (m === 0 && today.getDate() < parsed.day)) {
    age--;
  }
  return age >= 0 ? age : null;
}

export function getAgeCategory(age: number | null): string {
  if (age === null) return 'Indefinido';
  if (age <= 19) return 'Sub-20 (Até 19 anos)';
  if (age <= 29) return '20 a 29 anos';
  if (age <= 39) return '30 a 39 anos';
  if (age <= 49) return '40 a 49 anos';
  if (age <= 59) return '50 a 59 anos';
  return '60+ anos';
}

