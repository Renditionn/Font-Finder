async function toggleFontFinder(tab) {
  if (!tab || !tab.id) return;

  try {
    await chrome.tabs.sendMessage(tab.id, {
      type: "toggle"
    });
  } catch {
    try {
      await chrome.scripting.executeScript({
        target: {
          tabId: tab.id
        },
        files: ["content.js"]
      });

      await chrome.scripting.insertCSS({
        target: {
          tabId: tab.id
        },
        files: ["content.css"]
      });

      await chrome.tabs.sendMessage(tab.id, {
        type: "open"
      });
    } catch (error) {
      console.error("Font Finder:", error);
    }
  }
}

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "toggle-font-finder") return;

  const tabs = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  await toggleFontFinder(tabs[0]);
});

chrome.action.onClicked.addListener(async (tab) => {
  await toggleFontFinder(tab);
});