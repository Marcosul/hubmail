import { Injectable, Logger } from '@nestjs/common';

const c = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
};

@Injectable()
export class HtmlSanitizerService {
  private readonly log = new Logger(HtmlSanitizerService.name);
  constructor() {
    this.log.log(`${c.green}🧼 HtmlSanitizer pronto (regex-safe mode)${c.reset}`);
  }

  sanitize(html: string): string {
    if (!html) return '';

    // Remove tags with high XSS risk completely.
    const withoutBlockedTags = html
      .replace(/<\s*\/?\s*(script|style|iframe|object|embed|meta|link|base|form|input|button|textarea|select)[^>]*>/gi, '')
      .replace(/<\s*script[\s\S]*?<\s*\/\s*script\s*>/gi, '')
      .replace(/<\s*style[\s\S]*?<\s*\/\s*style\s*>/gi, '');

    return withoutBlockedTags
      .replace(/\son[a-z]+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, '')
      .replace(/\sstyle\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, '')
      .replace(
        /\s(href|src)\s*=\s*("|\')\s*javascript:[\s\S]*?\2/gi,
        ' $1="#"',
      );
  }
}
