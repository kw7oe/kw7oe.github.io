const SESSION_SELECTOR = '[data-terminal-session]';
const DEFAULT_COPY_LABEL = 'Copy';

function setActiveTab(session, panelName) {
  const tabs = session.querySelectorAll('[data-terminal-tab]');
  const panels = session.querySelectorAll('[data-terminal-panel]');

  tabs.forEach((tab) => {
    const isActive = tab.dataset.terminalTab === panelName;
    tab.classList.toggle('is-active', isActive);
    tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
    tab.tabIndex = isActive ? 0 : -1;
  });

  panels.forEach((panel) => {
    const isActive = panel.dataset.terminalPanel === panelName;
    panel.classList.toggle('is-hidden', !isActive);
    panel.hidden = !isActive;
  });
}

function currentPanelForCopy(session) {
  return session.querySelector('[data-terminal-panel]:not(.is-hidden)') || session.querySelector('[data-terminal-panel]');
}

function hasLongLines(session) {
  const panels = session.querySelectorAll('[data-terminal-panel] [data-terminal-copy-source]');

  return Array.from(panels).some((panelSource) => {
    const lines = panelSource.innerText.split('\n');
    return lines.some((line) => line.trim().length > 95);
  });
}

async function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
        // For modern browsers
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            console.error('Failed to copy text:', err);
        }
    }

    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();

    try {
        document.execCommand('copy');
        document.body.removeChild(textarea);
        return true;
    } catch (err) {
        console.error('Failed to copy text:', err);
        document.body.removeChild(textarea);
        return false;
    }
}


async function copyPanelContent(session, button) {
  const panel = currentPanelForCopy(session);
  const source = panel?.querySelector('[data-terminal-copy-source]');
  const text = source?.innerText?.trimEnd();

  if (!text) {
    return;
  }

  const originalLabel = panel?.dataset.terminalCopyLabel || DEFAULT_COPY_LABEL;

  try {
    await copyToClipboard(text);
    button.dataset.terminalCopyFeedback = 'true';
    button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
  } catch (_error) {
    button.dataset.terminalCopyFeedback = 'true';
    button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
  }

  window.setTimeout(() => {
    button.dataset.terminalCopyFeedback = '';
    button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
  }, 1100);
}

function initSession(session) {
  // Get the default tab from data attribute, default to 'command' if not set
  const defaultTab = session.dataset.defaultTab;
  setActiveTab(session, defaultTab);

  session.addEventListener('click', (event) => {
    const tabButton = event.target.closest('[data-terminal-tab]');

    if (tabButton) {
      setActiveTab(session, tabButton.dataset.terminalTab);
      return;
    }

    const copyButton = event.target.closest('[data-terminal-copy-button]');

    if (copyButton) {
      copyPanelContent(session, copyButton);
      return;
    }

    const wrapToggle = event.target.closest('[data-terminal-wrap-toggle]');

    if (wrapToggle) {
      const isEnabled = session.classList.toggle('is-wrap-enabled');
      wrapToggle.textContent = isEnabled ? 'Wrap: On' : 'Wrap: Off';
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll(SESSION_SELECTOR).forEach(initSession);
});
