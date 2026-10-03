"""Shared helpers for browser tests (Playwright, Chromium). Run with the site served on http://localhost:8080."""
import json, os
from playwright.sync_api import sync_playwright

BASE = os.environ.get('BASE', 'http://localhost:8080/')
AXE = os.environ.get('AXE_JS', '/tmp/claude-0/work/axe/node_modules/axe-core/axe.min.js')
SHOTS = os.environ.get('SHOTS', '/tmp/claude-0/work/shots')

def axe_check(page, label):
    page.add_script_tag(path=AXE)
    res = page.evaluate("""async () => {
      const r = await axe.run(document, {runOnly:{type:'tag', values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa','best-practice']}});
      return r.violations.map(v => ({id:v.id, impact:v.impact, help:v.help, nodes:v.nodes.slice(0,3).map(n=>n.target.join(' ')+' :: '+(n.failureSummary||'').split('\\n').slice(0,3).join(' | '))}));
    }""")
    return res

def hscroll(page):
    return page.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")

def answer_single(page, label):
    page.get_by_label(label, exact=True).check() if False else page.locator('label.opt', has_text=label).first.click()

def pick(page, *labels):
    for l in labels:
        page.locator('label.opt').filter(has_text=l).first.click()

def nxt(page):
    page.get_by_role('button', name='Next').click()
