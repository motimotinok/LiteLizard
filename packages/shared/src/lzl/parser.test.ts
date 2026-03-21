import { describe, expect, it } from 'vitest';
import { parseLzl } from './parser.js';

const completeExample = `---
documentId: d_a8f3k2m9x1
format: lzl-v1
title: 吾輩は猫である
chapters: 2
paragraphs: 5
created: 2026-03-20T00:00:00Z
updated: 2026-03-20T12:34:56Z
---

<!--:: ch c_x1y2z3w4a5 | 第一章 ::-->

<!--:: p p_abc123def4 ::-->
吾輩は猫である。名前はまだ無い。

<!--:: p p_def456ghi7 ::-->
どこで生れたかとんと見当がつかぬ。

<!--:: p p_jkl789mno0 ::-->
何でも薄暗いじめじめした所でニャーニャー泣いていた事だけは記憶している。

<!--:: ch c_m4n5o6p7q8 | 第二章 ::-->

<!--:: p p_pqr012stu3 ::-->
吾輩はここで始めて人間というものを見た。

<!--:: p p_vwx345yz67 ::-->
しかもあとで聞くとそれは書生という人間中で一番獰悪な種族であったそうだ。
`;

describe('parseLzl', () => {
  it('parses the complete example from the spec', () => {
    const parsed = parseLzl(completeExample);

    expect(parsed.frontmatter.documentId).toBe('d_a8f3k2m9x1');
    expect(parsed.frontmatter.title).toBe('吾輩は猫である');
    expect(parsed.chapters.map((chapter) => chapter.id)).toEqual(['c_x1y2z3w4a5', 'c_m4n5o6p7q8']);
    expect(parsed.paragraphs).toHaveLength(5);
    expect(parsed.paragraphs[0]).toEqual({
      id: 'p_abc123def4',
      chapterId: 'c_x1y2z3w4a5',
      chapterIndex: 0,
      text: '吾輩は猫である。名前はまだ無い。',
    });
    expect(parsed.paragraphs[4]?.chapterId).toBe('c_m4n5o6p7q8');
    expect(parsed.paragraphs[4]?.chapterIndex).toBe(1);
  });

  it('parses the minimum structure with an empty paragraph', () => {
    const parsed = parseLzl(`---
documentId: d_xxxxxxxxxx
format: lzl-v1
title: 無題
chapters: 1
paragraphs: 1
created: 2026-03-20T00:00:00Z
updated: 2026-03-20T00:00:00Z
---

<!--:: ch c_xxxxxxxxxx | 第1章 ::-->

<!--:: p p_xxxxxxxxxx ::-->
`);

    expect(parsed.chapters).toHaveLength(1);
    expect(parsed.paragraphs).toEqual([
      {
        id: 'p_xxxxxxxxxx',
        chapterId: 'c_xxxxxxxxxx',
        chapterIndex: 0,
        text: '',
      },
    ]);
  });

  it('parses multiple chapters and multiple paragraphs', () => {
    const parsed = parseLzl(`---
documentId: d_abcdefghij
format: lzl-v1
title: test
chapters: 2
paragraphs: 3
created: 2026-03-20T00:00:00Z
updated: 2026-03-20T00:00:00Z
---

<!--:: ch c_abcdefghij | 一章 ::-->

<!--:: p p_abcdefghij ::-->
A

<!--:: ch c_bcdefghijk | 二章 ::-->

<!--:: p p_bcdefghijk ::-->
B

<!--:: p p_cdefghijkl ::-->
C`);

    expect(parsed.chapters).toHaveLength(2);
    expect(parsed.paragraphs.map((paragraph) => paragraph.text)).toEqual(['A', 'B', 'C']);
    expect(parsed.paragraphs.map((paragraph) => paragraph.chapterIndex)).toEqual([0, 1, 1]);
  });

  it('partially parses files without frontmatter', () => {
    const parsed = parseLzl(`<!--:: ch c_abcdefghij | 一章 ::-->

本文
`);

    expect(parsed.frontmatter.format).toBe('');
    expect(parsed.chapters).toHaveLength(1);
    expect(parsed.paragraphs).toEqual([
      {
        id: '',
        chapterId: 'c_abcdefghij',
        chapterIndex: 0,
        text: '本文',
      },
    ]);
  });

  it('tracks chapter order even when chapter ids are duplicated', () => {
    const parsed = parseLzl(`---
documentId: d_abcdefghij
format: lzl-v1
title: test
chapters: 2
paragraphs: 2
created: 2026-03-20T00:00:00Z
updated: 2026-03-20T00:00:00Z
---

<!--:: ch c_abcdefghij | 一章 ::-->

<!--:: p p_abcdefghij ::-->
A

<!--:: ch c_abcdefghij | 二章 ::-->

<!--:: p p_bcdefghijk ::-->
B`);

    expect(parsed.paragraphs.map((paragraph) => paragraph.chapterIndex)).toEqual([0, 1]);
  });

  it('normalizes CRLF newlines', () => {
    const parsed = parseLzl(completeExample.replace(/\n/g, '\r\n'));

    expect(parsed.paragraphs).toHaveLength(5);
    expect(parsed.paragraphs[1]?.text).toBe('どこで生れたかとんと見当がつかぬ。');
  });
});
