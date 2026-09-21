import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Markdown } from './text';

describe('Markdown', () => {
  it('renders partial markup produced mid-stream without hanging', () => {
    for (const src of ['#', '##', '# Title\n##', '- [', '1.', '#hashtag line', '**bold']) {
      expect(() => renderToStaticMarkup(<Markdown source={src} />)).not.toThrow();
    }
  });

  it('renders headings, lists and checklists', () => {
    const html = renderToStaticMarkup(<Markdown source={'# T\n\n## S\n\n- a **b**\n\n1. one\n\n- [ ] todo'} />);
    expect(html).toContain('<h1>T</h1>');
    expect(html).toContain('<strong>b</strong>');
    expect(html).toContain('<ol>');
    expect(html).toContain('checklist');
  });
});
