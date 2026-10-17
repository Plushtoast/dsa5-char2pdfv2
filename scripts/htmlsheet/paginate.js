function pageOverflows(page) {
  const body = page.querySelector('.sheet-page-body');
  if (body && body.scrollHeight > body.clientHeight + 2) return true;
  return page.scrollHeight > page.clientHeight + 2;
}

function contentBottom(page) {
  const inner = page.querySelector('.sheet-page-inner');
  return inner ? inner.getBoundingClientRect().bottom - 4 : page.getBoundingClientRect().bottom - 48;
}

function cloneEmptyPage(page) {
  const clone = page.cloneNode(false);
  const bg = page.querySelector('.sheet-page-bg-img, .sheet-page-bg');
  if (bg) clone.appendChild(bg.cloneNode(true));
  const inner = page.querySelector('.sheet-page-inner');
  const innerClone = inner.cloneNode(false);
  const header = inner.querySelector('.sheet-page-header');
  if (header) {
    const headerClone = header.cloneNode(true);
    const kicker = headerClone.querySelector('.sheet-kicker');
    if (kicker && !kicker.querySelector('.sheet-cont')) {
      const span = page.ownerDocument.createElement('span');
      span.className = 'sheet-cont';
      span.textContent = ' …';
      kicker.appendChild(span);
    }
    innerClone.appendChild(headerClone);
  }
  const rule = inner.querySelector('.sheet-zierleiste');
  if (rule) innerClone.appendChild(rule.cloneNode(true));
  const body = page.ownerDocument.createElement('div');
  body.className = 'sheet-page-body';
  innerClone.appendChild(body);
  clone.appendChild(innerClone);
  return clone;
}

function splitTable(page, table) {
  const rows = [...(table.tBodies[0]?.rows || [])];
  if (rows.length < 2) return false;
  const limit = contentBottom(page);
  const firstOverflow = rows.findIndex((row) => row.getBoundingClientRect().bottom > limit);
  if (firstOverflow <= 0) return false;

  const next = cloneEmptyPage(page);
  page.after(next);
  const nextBody = next.querySelector('.sheet-page-body');
  const tableClone = table.cloneNode(true);
  const destBody = tableClone.tBodies[0];
  destBody.replaceChildren();
  rows.slice(firstOverflow).forEach((row) => destBody.appendChild(row));
  nextBody.appendChild(tableClone);

  let mover = table.parentElement;
  while (mover && mover !== page.querySelector('.sheet-page-body') && mover.nextElementSibling) {
    const siblings = [];
    let cursor = mover.nextElementSibling;
    while (cursor) {
      const following = cursor.nextElementSibling;
      siblings.push(cursor);
      cursor = following;
    }
    siblings.forEach((node) => nextBody.appendChild(node));
    break;
  }
  return true;
}

function ensureProseBlocks(prose) {
  if (prose.children.length) return;
  const text = prose.textContent;
  if (!text.trim()) return;
  prose.textContent = '';
  const paragraph = prose.ownerDocument.createElement('p');
  paragraph.textContent = text;
  prose.appendChild(paragraph);
}

function splitTextElement(el, limit, destParent) {
  const original = el.textContent;
  const parts = original.split(/(\s+)/);
  let keep = parts.length;
  while (keep > 0) {
    el.textContent = parts.slice(0, keep).join('').trimEnd();
    if (!el.textContent || el.getBoundingClientRect().bottom <= limit) break;
    keep -= 1;
  }
  if (keep <= 0 || !el.textContent) {
    const mid = Math.max(1, Math.floor(parts.length / 2));
    el.textContent = parts.slice(0, mid).join('').trimEnd()
      || original.slice(0, Math.max(1, Math.ceil(original.length / 2)));
    const leftover = (parts.slice(mid).join('') || original.slice(el.textContent.length)).trim();
    if (leftover) {
      const clone = el.cloneNode(false);
      clone.textContent = leftover;
      destParent.appendChild(clone);
    }
    return;
  }
  const rest = parts.slice(keep).join('').trim();
  if (rest) {
    const clone = el.cloneNode(false);
    clone.textContent = rest;
    destParent.appendChild(clone);
  }
}

function splitProseSection(page, section) {
  const prose = section.querySelector('.trait-text, .notes-prose')
    || (section.matches('[data-split-prose]') ? section : section.querySelector('[data-split-prose]'));
  if (!prose) return false;
  ensureProseBlocks(prose);
  const limit = contentBottom(page);
  if (prose.getBoundingClientRect().bottom <= limit) return false;

  const next = cloneEmptyPage(page);
  page.after(next);
  const nextBody = next.querySelector('.sheet-page-body');
  const nextSection = section.cloneNode(false);
  const heading = section.querySelector('h2, .trait-label');
  if (heading) nextSection.appendChild(heading.cloneNode(true));
  const nextProse = prose.cloneNode(false);
  nextSection.appendChild(nextProse);
  nextBody.appendChild(nextSection);

  let moving = false;
  for (const node of [...prose.childNodes]) {
    if (moving) {
      nextProse.appendChild(node);
      continue;
    }
    if (node.nodeType !== 1) continue;
    if (node.getBoundingClientRect().bottom <= limit) continue;
    if (node.getBoundingClientRect().top < limit - 12 && (node.textContent || '').trim()) {
      splitTextElement(node, limit, nextProse);
    } else {
      nextProse.appendChild(node);
    }
    moving = true;
  }

  let sibling = section.nextElementSibling;
  while (sibling) {
    const following = sibling.nextElementSibling;
    nextBody.appendChild(sibling);
    sibling = following;
  }
  return true;
}

function splitOverflow(page) {
  const body = page.querySelector('.sheet-page-body');
  if (!body) return false;
  const limit = contentBottom(page);
  const children = [...body.children];
  let index = children.findIndex((node) => node.getBoundingClientRect().bottom > limit);
  if (index < 0) {
    const table = [...body.querySelectorAll('table[data-split]')].find((tbl) =>
      [...(tbl.tBodies[0]?.rows || [])].some((row) => row.getBoundingClientRect().bottom > limit),
    );
    return table ? splitTable(page, table) : false;
  }

  const overflowing = children[index];
  const proseHost = overflowing.matches('[data-split-prose], .notes-section')
    ? overflowing
    : overflowing.querySelector?.('[data-split-prose], .notes-section');
  if (proseHost && overflowing.getBoundingClientRect().top < limit) {
    return splitProseSection(page, overflowing.matches('.notes-section, [data-split-prose]') ? overflowing : proseHost);
  }

  if (index === 0) {
    const table = overflowing.matches('table[data-split]')
      ? overflowing
      : overflowing.querySelector('table[data-split]');
    if (table) return splitTable(page, table);
    return false;
  }

  const next = cloneEmptyPage(page);
  page.after(next);
  const nextBody = next.querySelector('.sheet-page-body');
  children.slice(index).forEach((node) => nextBody.appendChild(node));
  return true;
}

export function paginateSheet(root) {
  const initial = [...root.querySelectorAll('.sheet-page')];
  for (const page of initial) {
    let current = page;
    let guard = 0;
    while (pageOverflows(current) && guard++ < 40) {
      if (!splitOverflow(current)) break;
      current = current.nextElementSibling;
      if (!current?.classList.contains('sheet-page')) break;
    }
  }
}
