// Sample content shown the first time a user opens the viewer. Doubles as a
// quick demo of every feature the renderer supports.

export const SAMPLE_README = `# Hello, world

This is a **markdown viewer + PDF exporter** built into x45.in. Type on the left, see the rendered preview on the right, then click *Export PDF* when you're done.

## What it supports

- Standard markdown — headings, **bold**, *italic*, ~~strikethrough~~
- GitHub-flavored extras: tables, task lists, autolinks
- Code blocks with syntax highlighting
- Blockquotes, horizontal rules, footnotes

## A table

| feature | supported |
|---|:---:|
| GFM tables | ✓ |
| Task lists | ✓ |
| Code highlighting | ✓ |
| Math (KaTeX) | — |
| Mermaid diagrams | — |

## A code block

\`\`\`ts
function greet(name: string): string {
  return \`hello, \${name}\`;
}

console.log(greet("world"));
\`\`\`

## A task list

- [x] Type your readme on the left
- [x] Watch it render on the right
- [ ] Export to PDF when you're happy
- [ ] Share the file with whoever needs it

## A blockquote

> The best tool is the one that gets out of your way.
> Markdown does this. PDFs don't, but at least we can bridge them.

---

That's it. Replace this text with your own and start writing.
`;
