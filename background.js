chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "toggle-font-finder") return;

  const tabs = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  const tab = tabs[0];

  if (!tab?.id) return;

  try {
    await chrome.tabs.sendMessage(tab.id, {
      type: "toggle"
    });
  } catch {
    await chrome.scripting.executeScript({
      target: {
        tabId: tab.id
      },
      files: ["content.js"]
    });
  }
});