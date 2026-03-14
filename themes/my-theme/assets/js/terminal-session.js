const SESSION_SELECTOR = '[data-terminal-session]';

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

async function copyPanelContent(button) {
  const panel = button.closest('[data-terminal-panel]');
  const source = panel?.querySelector('[data-terminal-copy-source]');
  const text = source?.innerText?.trimEnd();

  if (!text) {
    return;
  }

  const originalLabel = button.textContent;

  try {
    await navigator.clipboard.writeText(text);
    button.textContent = 'Copied';
  } catch (_error) {
    button.textContent = 'Copy failed';
  }

  window.setTimeout(() => {
    button.textContent = originalLabel;
  }, 1100);
}

function initSession(session) {
  setActiveTab(session, 'command');

  session.addEventListener('click', (event) => {
    const tabButton = event.target.closest('[data-terminal-tab]');

    if (tabButton) {
      setActiveTab(session, tabButton.dataset.terminalTab);
      return;
    }

    const copyButton = event.target.closest('[data-terminal-copy-button]');

    if (copyButton) {
      copyPanelContent(copyButton);
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
