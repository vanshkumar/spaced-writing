// Helpers for manipulating inkling note content

const DATE_RE = /^(?<hashes>#+)\s+(?<date>\d{4}-\d{2}-\d{2})\s*$/m;

export function upsertTodayEntry(
  content: string,
  dateHeaderLevel: string,
  isoDate: string,
  newParagraph: string
): string {
  // Ensure there is a today section (e.g., #### YYYY-MM-DD). Append paragraph to bottom of that section.
  if (hasDateHeader(content, dateHeaderLevel, isoDate)) {
    return appendParagraphToDateSection(content, dateHeaderLevel, isoDate, newParagraph);
  }
  return insertNewDateSectionAtTop(content, dateHeaderLevel, isoDate, newParagraph);
}

export function hasDateHeader(content: string, dateHeaderLevel: string, isoDate: string): boolean {
  const escaped = dateHeaderLevel.replace(/[#]/g, "#");
  const re = new RegExp(`^${escaped}\\s+${isoDate}\\s*$`, "m");
  return re.test(content);
}

export function insertNewDateSectionAtTop(
  content: string,
  dateHeaderLevel: string,
  isoDate: string,
  paragraph: string
): string {
  const lines = content.split(/\r?\n/);
  let insertIndex = 0;

  // Skip YAML frontmatter if present
  if (lines[0] === "---") {
    let i = 1;
    while (i < lines.length && lines[i] !== "---") i++;
    if (i < lines.length && lines[i] === "---") insertIndex = i + 1;
  }

  // Find H1 title; insert after it
  for (let i = insertIndex; i < lines.length; i++) {
    if (/^#\s+/.test(lines[i])) {
      insertIndex = i + 1;
      // Skip following single blank line if present
      if (lines[insertIndex] === "") insertIndex++;
      break;
    }
  }

  const headerBlock = [`${dateHeaderLevel} ${isoDate}`, paragraph.trim(), ""].join("\n");

  const before = lines.slice(0, insertIndex).join("\n");
  const after = lines.slice(insertIndex).join("\n");
  const prefix = before.length ? before + "\n\n" : "";
  const suffix = after.length ? "\n" + after : "";
  return prefix + headerBlock + suffix;
}

export function appendParagraphToDateSection(
  content: string,
  dateHeaderLevel: string,
  isoDate: string,
  paragraph: string
): string {
  const reHeader = new RegExp(`^${dateHeaderLevel.replace(/[#]/g, "#")}\\s+${isoDate}\\s*$`, "m");
  const match = reHeader.exec(content);
  if (!match) return content; // fallback

  const start = match.index + match[0].length; // position after header line

  // Find next date header of the same level
  const reNextHeader = new RegExp(`^${dateHeaderLevel.replace(/[#]/g, "#")}\\s+\\d{4}-\\d{2}-\\d{2}\\s*$`, "mg");
  reNextHeader.lastIndex = start;
  const next = reNextHeader.exec(content);
  const sectionEnd = next ? next.index : content.length;

  // Insert before sectionEnd, ensure a blank line before paragraph
  const before = content.slice(0, sectionEnd).replace(/\s*$/, "\n\n");
  const after = content.slice(sectionEnd);
  return before + paragraph.trim() + "\n" + after;
}

export function upsertFrontmatterSnooze(content: string, targetISO: string): string {
  const lines = content.split(/\r?\n/);
  if (lines[0] === "---") {
    // Update in-place
    let i = 1;
    let end = -1;
    for (; i < lines.length; i++) {
      if (lines[i] === "---") {
        end = i;
        break;
      }
    }
    if (end !== -1) {
      let found = false;
      for (let j = 1; j < end; j++) {
        if (lines[j].startsWith("snoozed_until:")) {
          lines[j] = `snoozed_until: ${targetISO}`;
          found = true;
          break;
        }
      }
      if (!found) {
        lines.splice(end, 0, `snoozed_until: ${targetISO}`);
      }
      return lines.join("\n");
    }
  }
  // No frontmatter — add it at the top
  const fm = [`---`, `snoozed_until: ${targetISO}`, `---`, ""].join("\n");
  return fm + content;
}
