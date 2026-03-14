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

function refreshCopyLabel(session) {
  const copyButton = session.querySelector('[data-terminal-copy-button]');
  const panel = currentPanelForCopy(session);
  const label = panel?.dataset.terminalCopyLabel || DEFAULT_COPY_LABEL;

  if (copyButton && !copyButton.dataset.terminalCopyFeedback) {
    copyButton.textContent = label;
  }
}

function hasLongLines(session) {
  const panels = session.querySelectorAll('[data-terminal-panel] [data-terminal-copy-source]');

  return Array.from(panels).some((panelSource) => {
    const lines = panelSource.innerText.split('\n');
    return lines.some((line) => line.trim().length > 95);
  });
}

function refreshWrapToggleVisibility(session) {
  const wrapToggle = session.querySelector('[data-terminal-wrap-toggle]');

  if (!wrapToggle) {
    return;
  }

  wrapToggle.hidden = !hasLongLines(session);
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
    await navigator.clipboard.writeText(text);
    button.dataset.terminalCopyFeedback = 'true';
    button.textContent = 'Copied';
  } catch (_error) {
    button.dataset.terminalCopyFeedback = 'true';
    button.textContent = 'Copy failed';
  }

  window.setTimeout(() => {
    button.dataset.terminalCopyFeedback = '';
    button.textContent = originalLabel;
  }, 1100);
}

function initSession(session) {
  setActiveTab(session, 'command');

  refreshCopyLabel(session);
  refreshWrapToggleVisibility(session);

  session.addEventListener('click', (event) => {
    const tabButton = event.target.closest('[data-terminal-tab]');

    if (tabButton) {
      setActiveTab(session, tabButton.dataset.terminalTab);
      refreshCopyLabel(session);
      refreshWrapToggleVisibility(session);
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
