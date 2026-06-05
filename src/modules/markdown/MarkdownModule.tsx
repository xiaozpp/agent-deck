import DOMPurify from "dompurify";
import { Upload } from "lucide-react";
import { marked } from "marked";
import { useMemo, useState } from "react";
import { toolApi } from "../../toolApi";
import type { MarkdownManifest } from "../../types";

function normalizeMarkdownImages(content: string, images: Record<string, string>) {
  let next = content;
  for (const [key, value] of Object.entries(images)) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    next = next.replace(new RegExp(`\\((?:\\.\\/)?${escaped}([^)]*)\\)`, "g"), `(${value}$1)`);
  }
  return next;
}

export function MarkdownModule() {
  const [manifest, setManifest] = useState<MarkdownManifest | null>(null);
  const [error, setError] = useState("");

  async function openMarkdown() {
    setError("");
    try {
      const result = await toolApi.openMarkdown();
      if (!result.canceled && result.manifest) setManifest(result.manifest);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Markdown 读取失败");
    }
  }

  const html = useMemo(() => {
    const content = manifest ? normalizeMarkdownImages(manifest.content, manifest.images) : "# Markdown 查看器\n\n点击“选择文档”打开 `.md` 文件。";
    return DOMPurify.sanitize(marked.parse(content, { async: false }) as string);
  }, [manifest]);

  const headings = useMemo(() => {
    const source = manifest?.content || "";
    return [...source.matchAll(/^(#{1,3})\s+(.+)$/gm)].slice(0, 12).map((match) => ({
      level: match[1].length,
      text: match[2].replace(/[#*_`]/g, ""),
    }));
  }, [manifest]);

  return (
    <section className="module-page markdown-layout">
      <div className="page-heading compact-heading">
        <div>
          <h1>Markdown 查看器</h1>
          <p>{manifest ? `${manifest.folderName} / ${manifest.name}` : "内嵌预览，不再打开独立 C# 窗口"}</p>
        </div>
        <button className="primary-button" type="button" onClick={openMarkdown}>
          <Upload size={17} />
          选择文档
        </button>
      </div>

      {error && <div className="error-box">{error}</div>}

      <div className="markdown-grid">
        <aside className="toc-panel">
          <h2>目录</h2>
          {headings.length === 0 && <p className="empty-text">暂无标题</p>}
          {headings.map((heading, index) => (
            <span className={`toc-level-${heading.level}`} key={`${heading.text}-${index}`}>
              {heading.text}
            </span>
          ))}
        </aside>
        <article className="markdown-preview" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </section>
  );
}
