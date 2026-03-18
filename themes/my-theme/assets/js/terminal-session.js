const SESSION_SELECTOR = '[data-terminal-session]';
const WRAP_PREFERENCE_KEY = 'terminalSessionWrapEnabledV2';
const LONG_LINE_THRESHOLD = 95;
const COPY_FEEDBACK_TIMEOUT_MS = 1100;

const ICONS = {
  copy: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>',
  success: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>',
  error: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
};

const WRAP_ICONS = {
  on: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16"></path><path d="M4 12h10a4 4 0 0 1 0 8H8"></path><path d="M10 18l-2 2 2 2"></path></svg>',
  off: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16"></path><path d="M4 12h16"></path><path d="M4 17h11"></path><path d="M18 17l2 2-2 2"></path></svg>',
};

function tabButtons(session) {
  return Array.from(session.querySelectorAll('[data-terminal-tab]'));
}

function tabPanels(session) {
  return Array.from(session.querySelectorAll('[data-terminal-panel]'));
}

function activePanelName(session) {
  return session.dataset.activePanel || session.dataset.defaultTab;
}

function getPanelName(panel) {
  return panel?.dataset.terminalPanel || '';
}

function updateStatusMessage(session, message) {
  const statusRegion = session.querySelector('[data-terminal-status]');

  if (statusRegion) {
    statusRegion.textContent = message;
  }
}

function swapIcon(iconElement, { next, iconName, datasetKey, swapClass = 'is-swapping', swapDelay = 70 }) {
  if (!iconElement) {
    return;
  }

  const owner = iconElement.closest('button');

  if (!owner) {
    iconElement.innerHTML = next;
    return;
  }

  const currentName = owner.dataset[datasetKey] || '';

  if (currentName !== iconName) {
    iconElement.classList.add(swapClass);
    window.setTimeout(() => {
      iconElement.innerHTML = next;
      iconElement.classList.remove(swapClass);
    }, swapDelay);
  } else {
    iconElement.innerHTML = next;
    iconElement.classList.remove(swapClass);
  }

  owner.dataset[datasetKey] = iconName;
}

function applyCopyButtonState(button, state) {
  const icon = button.querySelector('[data-terminal-copy-icon]');

  button.dataset.terminalCopyFeedback = state.feedback;

  if (icon) {
    const nextIcon = ICONS[state.icon] || ICONS.copy;
    swapIcon(icon, {
      next: nextIcon,
      iconName: state.icon,
      datasetKey: 'terminalCopyIcon',
    });
  }
}

function setCopyFeedback(session, button, state) {
  applyCopyButtonState(button, state);

  if (button.copyFeedbackTimeout) {
    window.clearTimeout(button.copyFeedbackTimeout);
  }

  button.copyFeedbackTimeout = window.setTimeout(() => {
    applyCopyButtonState(button, {
      feedback: '',
      icon: 'copy',
    });
    updateStatusMessage(session, '');
  }, COPY_FEEDBACK_TIMEOUT_MS);
}

function wireTabPanelRelationships(session) {
  const sessionId = session.id;

  if (!sessionId) {
    return;
  }

  tabButtons(session).forEach((tab) => {
    const panelName = tab.dataset.terminalTab;

    if (!panelName) {
      return;
    }

    const panelId = `${sessionId}-panel-${panelName}`;
    const tabId = `${sessionId}-tab-${panelName}`;

    tab.id = tab.id || tabId;
    tab.setAttribute('aria-controls', panelId);

    const panel = session.querySelector(`[data-terminal-panel="${panelName}"]`);

    if (panel) {
      panel.id = panelId;
      panel.setAttribute('aria-labelledby', tab.id);
    }
  });
}

function setActiveTab(session, panelName) {
  const tabs = tabButtons(session);
  const panels = tabPanels(session);
  const fallback = tabs[0]?.dataset.terminalTab;
  const targetPanel = tabs.some((tab) => tab.dataset.terminalTab === panelName) ? panelName : fallback;

  if (!targetPanel) {
    return;
  }

  session.dataset.activePanel = targetPanel;

  tabs.forEach((tab) => {
    const isActive = tab.dataset.terminalTab === targetPanel;
    tab.classList.toggle('is-active', isActive);
    tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
    tab.tabIndex = isActive ? 0 : -1;
  });

  panels.forEach((panel) => {
    const isActive = panel.dataset.terminalPanel === targetPanel;
    panel.hidden = !isActive;
  });
}

function currentPanelForCopy(session) {
  return session.querySelector('[data-terminal-panel]:not([hidden])') || session.querySelector('[data-terminal-panel]');
}

function hasLongLines(session) {
  const panels = session.querySelectorAll('[data-terminal-panel] [data-terminal-copy-source]');

  return Array.from(panels).some((panelSource) => {
    const lines = panelSource.innerText.split('\n');
    return lines.some((line) => line.trim().length > LONG_LINE_THRESHOLD);
  });
}

function readWrapPreference() {
  try {
    const stored = window.localStorage.getItem(WRAP_PREFERENCE_KEY);

    if (stored === null) {
      return null;
    }

    return stored === 'true';
  } catch (_error) {
    return null;
  }
}

function writeWrapPreference(isEnabled) {
  try {
    window.localStorage.setItem(WRAP_PREFERENCE_KEY, isEnabled ? 'true' : 'false');
  } catch (_error) {
    // Ignore localStorage failures in restricted browsing contexts.
  }
}

function setWrapState(session, isEnabled) {
  const wrapToggle = session.querySelector('[data-terminal-wrap-toggle]');

  session.classList.toggle('is-wrap-enabled', isEnabled);

  if (wrapToggle) {
    const icon = wrapToggle.querySelector('[data-terminal-wrap-icon]');
    const iconName = isEnabled ? 'on' : 'off';

    wrapToggle.setAttribute('aria-label', isEnabled ? 'Wrap: On' : 'Wrap: Off');
    wrapToggle.setAttribute('aria-pressed', isEnabled ? 'true' : 'false');

    if (icon) {
      swapIcon(icon, {
        next: WRAP_ICONS[iconName],
        iconName,
        datasetKey: 'terminalWrapIcon',
      });
    }
  }
}

function updateWrapToggleVisibility(session) {
  const wrapToggle = session.querySelector('[data-terminal-wrap-toggle]');

  if (!wrapToggle) {
    return;
  }

  const shouldShowToggle = hasLongLines(session);
  wrapToggle.hidden = !shouldShowToggle;

  if (!shouldShowToggle) {
    setWrapState(session, true);
  }
}

async function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_error) {
      // Fall through to the execCommand fallback.
    }
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();

  try {
    const copied = document.execCommand('copy');
    document.body.removeChild(textarea);
    return copied;
  } catch (_error) {
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

  const panelName = getPanelName(panel) || activePanelName(session) || 'panel';
  const copied = await copyToClipboard(text);

  if (copied) {
    updateStatusMessage(session, `Copied ${panelName}`);
    setCopyFeedback(session, button, {
      feedback: 'success',
      icon: 'success',
    });
    return;
  }

  updateStatusMessage(session, 'Copy failed');
  setCopyFeedback(session, button, {
    feedback: 'error',
    icon: 'error',
  });
}

function handleTabKeydown(event, session) {
  const isTab = event.target.matches('[data-terminal-tab]');

  if (!isTab) {
    return;
  }

  const tabs = tabButtons(session);

  if (tabs.length < 2) {
    return;
  }

  const currentIndex = tabs.indexOf(event.target);
  let nextIndex = null;

  if (event.key === 'ArrowRight') {
    nextIndex = (currentIndex + 1) % tabs.length;
  }

  if (event.key === 'ArrowLeft') {
    nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
  }

  if (event.key === 'Home') {
    nextIndex = 0;
  }

  if (event.key === 'End') {
    nextIndex = tabs.length - 1;
  }

  if (nextIndex !== null) {
    event.preventDefault();
    const nextTab = tabs[nextIndex];
    setActiveTab(session, nextTab.dataset.terminalTab);
    nextTab.focus();
    return;
  }

  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    setActiveTab(session, event.target.dataset.terminalTab);
  }
}

function initSession(session) {
  wireTabPanelRelationships(session);

  const defaultTab = session.dataset.defaultTab;
  setActiveTab(session, defaultTab);

  const wrapPreference = readWrapPreference();
  setWrapState(session, wrapPreference === null ? true : wrapPreference);
  updateWrapToggleVisibility(session);

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

    if (wrapToggle && !wrapToggle.hidden) {
      const isEnabled = !session.classList.contains('is-wrap-enabled');
      setWrapState(session, isEnabled);
      writeWrapPreference(isEnabled);
    }
  });

  session.addEventListener('keydown', (event) => {
    handleTabKeydown(event, session);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll(SESSION_SELECTOR).forEach(initSession);
});
