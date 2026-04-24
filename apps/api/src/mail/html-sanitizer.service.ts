import { Injectable, Logger } from '@nestjs/common';
import createDOMPurify from 'isomorphic-dompurify';
import { JSDOM } from 'jsdom';

const c = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
};

@Injectable()
export class HtmlSanitizerService {
  private readonly log = new Logger(HtmlSanitizerService.name);
  private readonly purify: ReturnType<typeof createDOMPurify>;

  constructor() {
    const window = new JSDOM('').window as unknown as Window;
    this.purify = createDOMPurify(window as unknown as Window & typeof globalThis);
    this.log.log(`${c.green}🧼 HtmlSanitizer pronto (DOMPurify + JSDOM)${c.reset}`);
  }

  sanitize(html: string): string {
    return this.purify.sanitize(html, {
      ALLOWED_TAGS: [
        'a', 'b', 'blockquote', 'br', 'code', 'div', 'em', 'h1', 'h2', 'h3', 'h4',
        'h5', 'h6', 'hr', 'i', 'img', 'li', 'ol', 'p', 'pre', 'span', 'strong',
        'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'u', 'ul',
      ],
      ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'style', 'target', 'rel', 'width', 'height'],
      ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|cid|data):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    });
  }
}
